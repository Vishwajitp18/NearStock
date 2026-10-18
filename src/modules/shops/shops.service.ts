import { query, transaction } from '../../config/db';
import { cache } from '../../config/redis';
import { AppError } from '../../middleware/error';
import { calculateHaversineDistance } from '../../lib/geo';

export class ShopsService {
  async registerShop(ownerId: string, data: any) {
    const { rows } = await query(
      `INSERT INTO shops (
        owner_id, name, description, phone, address, city, pincode,
        location, status, is_open_now, delivery_available, delivery_radius_m
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, ST_MakePoint($8, $9), 'pending', TRUE, $10, $11)
      RETURNING id, name, description, phone, address, city, pincode,
                ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
                status, is_open_now, delivery_available, delivery_radius_m, avg_rating, created_at`,
      [
        ownerId,
        data.name,
        data.description || null,
        data.phone,
        data.address,
        data.city || null,
        data.pincode || null,
        data.lng,
        data.lat,
        data.delivery_available ?? false,
        data.delivery_radius_m || null,
      ]
    );

    const shop = rows[0];

    // Seed default business hours (08:00 to 22:00)
    for (let day = 0; day <= 6; day++) {
      await query(
        `INSERT INTO shop_hours (shop_id, weekday, opens_at, closes_at, is_closed)
         VALUES ($1, $2, '08:00:00', '22:00:00', FALSE)
         ON CONFLICT (shop_id, weekday) DO NOTHING`,
        [shop.id, day]
      );
    }

    return shop;
  }

  async updateShop(shopId: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      values.push(data.name);
      fields.push(`name = $${values.length}`);
    }
    if (data.description !== undefined) {
      values.push(data.description);
      fields.push(`description = $${values.length}`);
    }
    if (data.phone !== undefined) {
      values.push(data.phone);
      fields.push(`phone = $${values.length}`);
    }
    if (data.address !== undefined) {
      values.push(data.address);
      fields.push(`address = $${values.length}`);
    }
    if (data.city !== undefined) {
      values.push(data.city);
      fields.push(`city = $${values.length}`);
    }
    if (data.pincode !== undefined) {
      values.push(data.pincode);
      fields.push(`pincode = $${values.length}`);
    }
    if (data.is_open_now !== undefined) {
      values.push(data.is_open_now);
      fields.push(`is_open_now = $${values.length}`);
    }
    if (data.delivery_available !== undefined) {
      values.push(data.delivery_available);
      fields.push(`delivery_available = $${values.length}`);
    }
    if (data.delivery_radius_m !== undefined) {
      values.push(data.delivery_radius_m);
      fields.push(`delivery_radius_m = $${values.length}`);
    }
    if (data.lat !== undefined && data.lng !== undefined) {
      values.push(data.lng);
      const lngParam = `$${values.length}`;
      values.push(data.lat);
      const latParam = `$${values.length}`;
      fields.push(`location = ST_MakePoint(${lngParam}, ${latParam})`);
    }

    if (fields.length === 0) {
      return this.getShopById(shopId);
    }

    values.push(shopId);
    const sql = `
      UPDATE shops
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, name, description, phone, address, city, pincode,
                ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
                status, is_open_now, delivery_available, delivery_radius_m, avg_rating, created_at;
    `;

    const { rows } = await query(sql, values);
    if (rows.length === 0) {
      throw new AppError('Shop not found', 404, 'NOT_FOUND');
    }

    // Invalidate caches
    await cache.invalidatePattern(`shop:${shopId}:*`);
    await cache.invalidatePattern('shops:nearby:*');

    return rows[0];
  }

  async setShopHours(shopId: string, hours: Array<{ weekday: number; opens_at?: string | null; closes_at?: string | null; is_closed?: boolean }>) {
    await transaction(async (client) => {
      for (const h of hours) {
        await client.query(
          `INSERT INTO shop_hours (shop_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (shop_id, weekday) DO UPDATE
           SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at, is_closed = EXCLUDED.is_closed`,
          [shopId, h.weekday, h.opens_at || null, h.closes_at || null, h.is_closed ?? false]
        );
      }
    });

    return this.getShopHours(shopId);
  }

  async getShopHours(shopId: string) {
    const { rows } = await query(
      `SELECT weekday, opens_at, closes_at, is_closed
       FROM shop_hours
       WHERE shop_id = $1
       ORDER BY weekday ASC`,
      [shopId]
    );
    return rows;
  }

  async getShopById(shopId: string) {
    const { rows } = await query(
      `SELECT s.id, s.name, s.description, s.phone, s.address, s.city, s.pincode,
              ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
              s.status, s.is_open_now, s.delivery_available, s.delivery_radius_m,
              s.avg_rating, s.created_at,
              u.name AS owner_name, u.phone AS owner_phone
       FROM shops s
       JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [shopId]
    );

    if (rows.length === 0) {
      throw new AppError('Shop not found', 404, 'NOT_FOUND');
    }

    const shop = rows[0];
    const hours = await this.getShopHours(shopId);
    return { ...shop, hours };
  }

  async getNearbyShops(params: {
    lat: number;
    lng: number;
    radius: number;
    category?: number;
    limit: number;
  }) {
    let sql = `
      SELECT s.id, s.name, s.description, s.phone, s.address, s.city, s.pincode,
             ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
             s.is_open_now, s.delivery_available, s.delivery_radius_m, s.avg_rating,
             ST_Distance(s.location, ST_MakePoint($1, $2)::geography) AS distance_m
      FROM shops s
      WHERE s.status = 'approved'
        AND ST_DWithin(s.location, ST_MakePoint($1, $2)::geography, $3)
    `;
    const values: any[] = [params.lng, params.lat, params.radius];

    if (params.category) {
      values.push(params.category);
      sql += `
        AND EXISTS (
          SELECT 1 FROM inventory i
          JOIN products p ON p.id = i.product_id
          WHERE i.shop_id = s.id AND i.quantity > 0 AND p.category_id = $${values.length}
        )
      `;
    }

    values.push(params.limit);
    sql += ` ORDER BY s.location <-> ST_MakePoint($1, $2)::geography LIMIT $${values.length}`;

    const { rows } = await query(sql, values);
    return rows.map((r) => ({
      ...r,
      distance_m: Math.round(r.distance_m),
    }));
  }

  async getShopInventory(shopId: string, params: { q?: string; category?: number; limit: number; offset: number }) {
    let sql = `
      SELECT i.id AS inventory_id, i.price, i.mrp, i.quantity, i.low_stock_threshold,
             i.is_available, i.updated_at,
             p.id AS product_id, p.name, p.brand, p.barcode, p.unit, p.image_url,
             c.id AS category_id, c.name AS category_name
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE i.shop_id = $1
    `;
    const values: any[] = [shopId];

    if (params.category) {
      values.push(params.category);
      sql += ` AND p.category_id = $${values.length}`;
    }

    if (params.q) {
      values.push(params.q);
      sql += ` AND (p.name ILIKE '%' || $${values.length} || '%' OR p.brand ILIKE '%' || $${values.length} || '%')`;
    }

    values.push(params.limit);
    values.push(params.offset);
    sql += ` ORDER BY p.name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await query(sql, values);

    const countRes = await query(`SELECT COUNT(*) FROM inventory WHERE shop_id = $1`, [shopId]);
    return {
      total: parseInt(countRes.rows[0].count, 10),
      items: rows,
    };
  }

  async getShopAlerts(shopId: string) {
    const { rows } = await query(
      `SELECT i.id AS inventory_id, i.price, i.quantity, i.low_stock_threshold, i.updated_at,
              p.id AS product_id, p.name, p.brand, p.unit, p.image_url
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.shop_id = $1 AND i.quantity <= i.low_stock_threshold
       ORDER BY i.quantity ASC`,
      [shopId]
    );
    return rows;
  }

  async getShopAnalytics(shopId: string) {
    // 1. Get shop location
    const shopRes = await query(
      `SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM shops WHERE id = $1`,
      [shopId]
    );
    if (shopRes.rows.length === 0) {
      throw new AppError('Shop not found', 404, 'NOT_FOUND');
    }

    const { lat, lng } = shopRes.rows[0];

    // 2. Find searches logged near this shop (within 3km)
    const { rows: demandRows } = await query(
      `SELECT sl.query, COUNT(*) AS search_count,
              MAX(sl.created_at) AS last_searched_at,
              p.name AS product_name, p.id AS product_id,
              EXISTS(
                SELECT 1 FROM inventory i WHERE i.shop_id = $1 AND i.product_id = sl.product_id AND i.quantity > 0
              ) AS in_stock_in_shop
       FROM search_logs sl
       LEFT JOIN products p ON p.id = sl.product_id
       WHERE sl.location IS NOT NULL
         AND ST_DWithin(sl.location, ST_MakePoint($2, $3)::geography, 3000)
       GROUP BY sl.query, sl.product_id, p.name, p.id
       ORDER BY search_count DESC
       LIMIT 10`,
      [shopId, lng, lat]
    );

    // 3. Inventory stats
    const statsRes = await query(
      `SELECT 
         COUNT(*) AS total_items,
         COUNT(*) FILTER (WHERE quantity > 0) AS in_stock_items,
         COUNT(*) FILTER (WHERE quantity <= low_stock_threshold) AS low_stock_items,
         COALESCE(SUM(quantity * price), 0) AS total_inventory_value
       FROM inventory
       WHERE shop_id = $1`,
      [shopId]
    );

    return {
      stats: statsRes.rows[0],
      nearbyDemand: demandRows,
    };
  }
}

