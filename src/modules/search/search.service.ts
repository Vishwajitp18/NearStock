import { query } from '../../config/db';
import { cache } from '../../config/redis';
import { publishEvent } from '../../config/queue';
import { searchProducts } from '../../lib/searchSync';
import { toGeohash } from '../../lib/geo';
import { calculateBatchEta } from '../../lib/routingClient';

export interface SearchParams {
  q: string;
  lat: number;
  lng: number;
  radius: number;
  sort: 'nearest' | 'fastest' | 'cheapest' | 'best';
}

export class SearchService {
  async searchNearby(params: SearchParams, userId?: string) {
    // Step A: Find product(s)
    const matchedProducts = await searchProducts(params.q, 5);
    if (matchedProducts.length === 0) {
      // Log failed search for demand analytics
      await publishEvent('search.performed', {
        userId,
        query: params.q,
        lat: params.lat,
        lng: params.lng,
        resultsCount: 0,
      });

      return {
        query: params.q,
        product: null,
        radius_m: params.radius,
        sort: params.sort,
        results: [],
        message: 'No matching product found in catalog. Try another search term.',
      };
    }

    const primaryProduct = matchedProducts[0];
    return this.findShopsForProduct(
      primaryProduct,
      params.lat,
      params.lng,
      params.radius,
      params.sort,
      params.q,
      userId
    );
  }

  async findShopsForProduct(
    product: { id: string; name: string; unit?: string; brand?: string; barcode?: string },
    lat: number,
    lng: number,
    initialRadius: number,
    sortMode: 'nearest' | 'fastest' | 'cheapest' | 'best',
    searchQueryText?: string,
    userId?: string
  ) {
    const geohash6 = toGeohash(lat, lng, 6);
    const cacheKey = `search:${product.id}:${geohash6}:${initialRadius}:${sortMode}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    // Step B: Query nearby open & approved shops with stock
    let radius = initialRadius;
    let autoExpanded = false;
    let originalRadius = initialRadius;
    let candidates = await this.queryShopsAtRadius(product.id, lat, lng, radius);

    // Section 14 Edge Case: Auto-expand radius in steps (1 km, 3 km, 5 km, 10 km) if no results found
    if (candidates.length === 0) {
      const expansionTiers = [1000, 3000, 5000, 10000];
      for (const tier of expansionTiers) {
        if (tier > radius) {
          candidates = await this.queryShopsAtRadius(product.id, lat, lng, tier);
          if (candidates.length > 0) {
            radius = tier;
            autoExpanded = true;
            break;
          }
        }
      }
    }

    if (candidates.length === 0) {
      const response = {
        query: searchQueryText || product.name,
        product: { id: product.id, name: product.name, unit: product.unit, brand: product.brand },
        radius_m: radius,
        radius_auto_expanded: autoExpanded,
        original_radius_m: originalRadius,
        sort: sortMode,
        results: [],
        message: `Currently out of stock at all approved shops within ${radius / 1000} km.`,
      };

      await publishEvent('search.performed', {
        userId,
        query: searchQueryText || product.name,
        productId: product.id,
        lat,
        lng,
        resultsCount: 0,
      });

      return response;
    }

    // Step C: Calculate road distance and duration (ETA)
    const destinationPoints = candidates.map((c) => ({
      shopId: c.shop_id,
      lat: c.lat,
      lng: c.lng,
      distanceMeters: Math.round(c.distance_m),
    }));

    const etaMap = await calculateBatchEta({ lat, lng }, destinationPoints);

    // Compute metrics for normalization & tags
    let minDistance = Infinity;
    let minEta = Infinity;
    let minPrice = Infinity;

    const parsedResults = candidates.map((row) => {
      const eta = etaMap.get(row.shop_id);
      const distanceM = eta ? eta.distanceMeters : Math.round(row.distance_m);
      const etaSec = eta ? eta.durationSeconds : Math.round((distanceM * 1.3) / (25 * 0.27778) + 120);
      const price = parseFloat(row.price);
      const mrp = row.mrp ? parseFloat(row.mrp) : null;
      const rating = row.avg_rating ? parseFloat(row.avg_rating) : 0;
      const qty = parseInt(row.quantity, 10);

      if (distanceM < minDistance) minDistance = distanceM;
      if (etaSec < minEta) minEta = etaSec;
      if (price < minPrice) minPrice = price;

      // Stock confidence based on age of updated_at
      const confidence = this.computeStockConfidence(row.stock_updated_at);
      const quantityHint = qty <= 5 ? 'Few left' : 'In stock';

      return {
        shop: {
          id: row.shop_id,
          name: row.name,
          lat: row.lat,
          lng: row.lng,
          phone: row.phone,
          address: row.address,
        },
        price,
        mrp,
        in_stock: true,
        quantity_hint: quantityHint,
        quantity: qty,
        distance_m: distanceM,
        eta_seconds: etaSec,
        eta_estimated: eta ? eta.etaEstimated : true,
        stock_updated_at: row.stock_updated_at,
        rating,
        stock_confidence: confidence,
        tags: [] as string[],
        score: 0,
      };
    });

    // Assign server-side badges/tags (nearest, fastest, cheapest)
    for (const item of parsedResults) {
      if (item.distance_m === minDistance) item.tags.push('nearest');
      if (item.eta_seconds === minEta) item.tags.push('fastest');
      if (item.price === minPrice) item.tags.push('cheapest');
    }

    // Step D: Ranking & Sorting
    const sorted = this.rankAndSortResults(parsedResults, sortMode);

    const finalResponse = {
      query: searchQueryText || product.name,
      product: { id: product.id, name: product.name, unit: product.unit, brand: product.brand },
      radius_m: radius,
      radius_auto_expanded: autoExpanded,
      ...(autoExpanded ? { original_radius_m: originalRadius } : {}),
      sort: sortMode,
      results: sorted.map(({ rating, stock_confidence, score, quantity, eta_estimated, ...publicFields }) => publicFields),
    };

    // Cache in Redis for 45s (Section 9)
    await cache.setex(cacheKey, 45, JSON.stringify(finalResponse));

    // Publish search analytics event
    await publishEvent('search.performed', {
      userId,
      query: searchQueryText || product.name,
      productId: product.id,
      lat,
      lng,
      resultsCount: sorted.length,
    });

    return finalResponse;
  }

  private async queryShopsAtRadius(productId: string, lat: number, lng: number, radiusM: number) {
    // SQL strictly matching Section 6.2
    const sql = `
      SELECT
        s.id            AS shop_id,
        s.name,
        s.phone,
        s.address,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        i.price,
        i.mrp,
        i.quantity,
        i.updated_at    AS stock_updated_at,
        s.avg_rating,
        ST_Distance(s.location, ST_MakePoint($1, $2)::geography) AS distance_m
      FROM inventory i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.product_id = $3
        AND i.quantity > 0
        AND s.status = 'approved'
        AND s.is_open_now = TRUE
        AND ST_DWithin(s.location, ST_MakePoint($1, $2)::geography, $4)
      ORDER BY s.location <-> ST_MakePoint($1, $2)::geography
      LIMIT 20;
    `;

    const { rows } = await query(sql, [lng, lat, productId, radiusM]);
    return rows;
  }

  private computeStockConfidence(updatedAt: Date | string): number {
    const ageHours = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 3600);
    if (ageHours <= 2) return 1.0;
    if (ageHours <= 12) return 0.85;
    if (ageHours <= 24) return 0.70;
    if (ageHours <= 72) return 0.50;
    if (ageHours <= 168) return 0.35; // 1 week
    return 0.20;
  }

  private rankAndSortResults(
    items: any[],
    sortMode: 'nearest' | 'fastest' | 'cheapest' | 'best'
  ) {
    if (items.length <= 1) return items;

    if (sortMode === 'nearest') {
      return items.sort((a, b) => a.distance_m - b.distance_m);
    }
    if (sortMode === 'fastest') {
      return items.sort((a, b) => a.eta_seconds - b.eta_seconds);
    }
    if (sortMode === 'cheapest') {
      return items.sort((a, b) => a.price === b.price ? a.distance_m - b.distance_m : a.price - b.price);
    }

    // Best (Section 6.4 Weighted Score):
    // score = 0.40 * norm(price_inverse) + 0.35 * norm(distance_inverse) + 0.15 * norm(rating) + 0.10 * norm(stock_confidence)
    const minPrice = Math.min(...items.map((i) => i.price));
    const maxPrice = Math.max(...items.map((i) => i.price));
    const minDistance = Math.min(...items.map((i) => i.distance_m));
    const maxDistance = Math.max(...items.map((i) => i.distance_m));
    const minRating = Math.min(...items.map((i) => i.rating));
    const maxRating = Math.max(...items.map((i) => i.rating));

    for (const item of items) {
      const priceInvNorm = maxPrice === minPrice ? 1.0 : (maxPrice - item.price) / (maxPrice - minPrice);
      const distInvNorm = maxDistance === minDistance ? 1.0 : (maxDistance - item.distance_m) / (maxDistance - minDistance);
      const ratingNorm = maxRating === minRating ? 1.0 : (item.rating - minRating) / (maxRating - minRating);
      const confNorm = item.stock_confidence;

      item.score =
        0.40 * priceInvNorm +
        0.35 * distInvNorm +
        0.15 * ratingNorm +
        0.10 * confNorm;
    }

    return items.sort((a, b) => b.score - a.score);
  }
}

