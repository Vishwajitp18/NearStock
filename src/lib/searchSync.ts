import { MeiliSearch } from 'meilisearch';
import { config } from '../config/env';
import { logger } from './logger';
import { query } from '../config/db';

let meiliClient: MeiliSearch | null = null;
let isMeiliHealthy = false;

try {
  meiliClient = new MeiliSearch({
    host: config.meili.host,
    apiKey: config.meili.apiKey,
  });

  meiliClient.isHealthy().then((healthy) => {
    isMeiliHealthy = healthy;
    if (healthy) {
      logger.info('Meilisearch connected and healthy');
      initMeiliIndex();
    }
  }).catch(() => {
    isMeiliHealthy = false;
    logger.info('Meilisearch not detected, using PostgreSQL pg_trgm for typo-tolerant search');
  });
} catch (err: any) {
  logger.info(`Meilisearch init skipped: ${err.message}`);
}

async function initMeiliIndex() {
  if (!meiliClient) return;
  try {
    const index = meiliClient.index('products');
    await index.updateSearchableAttributes(['name', 'brand', 'barcode', 'description']);
    await index.updateFilterableAttributes(['category_id', 'is_verified']);
  } catch (e: any) {
    logger.debug(`Could not update Meilisearch attributes: ${e.message}`);
  }
}

export async function searchProducts(
  searchTerm: string,
  limit: number = 20
): Promise<Array<{ id: string; name: string; brand: string; unit: string; barcode?: string; image_url?: string }>> {
  const cleanTerm = searchTerm.trim();
  if (!cleanTerm) return [];

  // 1. Try Meilisearch if available
  if (isMeiliHealthy && meiliClient) {
    try {
      const res = await meiliClient.index('products').search(cleanTerm, {
        limit,
        filter: 'is_verified = true',
      });
      if (res.hits && res.hits.length > 0) {
        return res.hits.map((h: any) => ({
          id: h.id,
          name: h.name,
          brand: h.brand,
          unit: h.unit,
          barcode: h.barcode,
          image_url: h.image_url,
        }));
      }
    } catch (err: any) {
      logger.debug(`Meilisearch query failed: ${err.message}. Falling back to PostgreSQL pg_trgm.`);
    }
  }

  // 2. PostgreSQL pg_trgm similarity fallback
  const sql = `
    SELECT id, name, brand, barcode, unit, image_url, description,
           similarity(name, $1) AS sim
    FROM products
    WHERE is_verified = TRUE
      AND (
        name % $1
        OR brand % $1
        OR name ILIKE '%' || $1 || '%'
        OR brand ILIKE '%' || $1 || '%'
        OR barcode = $1
      )
    ORDER BY sim DESC, name ASC
    LIMIT $2;
  `;

  try {
    const { rows } = await query(sql, [cleanTerm, limit]);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand,
      unit: r.unit,
      barcode: r.barcode,
      image_url: r.image_url,
    }));
  } catch (err: any) {
    if (config.enableMockFallback) {
      const mockCatalog = [
        { id: '23f27f9c-74d5-4d02-b810-875d64600cd8', name: 'Amul Butter 500g', brand: 'Amul', unit: '500 g', barcode: '8901262010053' },
        { id: '23f27f9c-74d5-4d02-b810-875d64600cd9', name: 'Amul Taaza Toned Milk 1L', brand: 'Amul', unit: '1 L', barcode: '8901262010060' },
        { id: '23f27f9c-74d5-4d02-b810-875d64600ce0', name: 'Aashirvaad Shudh Chakki Atta 5kg', brand: 'Aashirvaad', unit: '5 kg', barcode: '8901030383854' },
        { id: '23f27f9c-74d5-4d02-b810-875d64600ce1', name: 'Maggi 2-Minute Instant Noodles 280g', brand: 'Nestle', unit: '280 g', barcode: '8901058852325' },
        { id: '23f27f9c-74d5-4d02-b810-875d64600ce2', name: 'Paracetamol 500mg Tablets 10s', brand: 'Calpol', unit: 'strip of 10', barcode: '8901058852999' },
      ];
      const lower = cleanTerm.toLowerCase();
      const filtered = mockCatalog.filter(
        (p) => p.name.toLowerCase().includes(lower) || p.brand.toLowerCase().includes(lower) || p.barcode === cleanTerm
      );
      return filtered.length > 0 ? filtered : [mockCatalog[0]];
    }
    throw err;
  }
}

export async function syncProductToSearchIndex(product: any): Promise<void> {
  if (!isMeiliHealthy || !meiliClient) return;
  try {
    const index = meiliClient.index('products');
    await index.addDocuments([product]);
  } catch (err: any) {
    logger.warn(`Failed to sync product ${product.id} to Meilisearch: ${err.message}`);
  }
}

