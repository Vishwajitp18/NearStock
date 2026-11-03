import { query, transaction } from '../../config/db';
import { cache } from '../../config/redis';
import { AppError } from '../../middleware/error';
import { calculateHaversineDistance } from '../../lib/geo';
import { config } from '../../config/env';

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
    try {
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
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (config.enableMockFallback) {
        return {
          id: shopId,
          name: 'Sharma General & Grocery Store',
          description: 'Fresh dairy, grains, snacks & daily kirana essentials',
          phone: '+919888888881',
          address: 'Shop 4, 100ft Road, Indiranagar',
          city: 'Bangalore',
          pincode: '560038',
          lat: 12.9716,
          lng: 77.5946,
          status: 'approved',
          is_open_now: true,
          delivery_available: true,
          delivery_radius_m: 5000,
          avg_rating: 4.8,
          created_at: new Date().toISOString(),
          owner_name: 'Ramesh Sharma',
          owner_phone: '+919888888881',
          hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            weekday: day,
            opens_at: '08:00:00',
            closes_at: '22:00:00',
            is_closed: false,
          })),
        };
      }
      throw err;
    }
  }

  async getNearbyShops(params: {
    lat: number;
    lng: number;
    radius: number;
    category?: number;
    limit: number;
  }) {
    try {
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
    } catch (err: any) {
      if (config.enableMockFallback) {
        return [
          {
            id: '7f4c7957-6a81-42a6-82c7-5b5d3cf14771',
            name: 'Sharma General & Grocery Store',
            description: 'Fresh dairy, grains & daily kirana',
            phone: '+919888888881',
            address: 'Shop 4, 100ft Road, Indiranagar',
            city: 'Bangalore',
            pincode: '560038',
            lat: 12.9716,
            lng: 77.5946,
            is_open_now: true,
            delivery_available: true,
            delivery_radius_m: 5000,
            avg_rating: 4.8,
            distance_m: 350,
          },
          {
            id: '7f4c7957-6a81-42a6-82c7-5b5d3cf14772',
            name: 'Apollo Pharmacy & Wellness',
            description: 'Medicines, personal care & baby food',
            phone: '+919888888882',
            address: '12 Brigade Road, Ashok Nagar',
            city: 'Bangalore',
            pincode: '560025',
            lat: 12.9740,
            lng: 77.6010,
            is_open_now: true,
            delivery_available: true,
            delivery_radius_m: 6000,
            avg_rating: 4.6,
            distance_m: 820,
          },
          {
            id: '7f4c7957-6a81-42a6-82c7-5b5d3cf14773',
            name: 'Metro Supermarket',
            description: 'Supermarket with snacks, beverages & groceries',
            phone: '+919888888883',
            address: '88 Richmond Road, Bangalore',
            city: 'Bangalore',
            pincode: '560025',
            lat: 12.9650,
            lng: 77.5880,
            is_open_now: true,
            delivery_available: false,
            delivery_radius_m: 3000,
            avg_rating: 4.3,
            distance_m: 1650,
          },
        ];
      }
      throw err;
    }
  }

  async getShopInventory(shopId: string, params: { q?: string; category?: number; limit: number; offset: number }) {
    try {
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
    } catch (err: any) {
      if (config.enableMockFallback) {
        const mockItems = [
          {
            inventory_id: 'inv-1',
            price: 275,
            mrp: 285,
            quantity: 18,
            low_stock_threshold: 5,
            is_available: true,
            updated_at: new Date().toISOString(),
            product_id: '23f27f9c-74d5-4d02-b810-875d64600cd8',
            name: 'Amul Butter 500g',
            brand: 'Amul',
            barcode: '8901262010053',
            unit: '500 g',
            image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
            category_id: 1,
            category_name: 'Dairy',
          },
          {
            inventory_id: 'inv-2',
            price: 72,
            mrp: 75,
            quantity: 24,
            low_stock_threshold: 10,
            is_available: true,
            updated_at: new Date().toISOString(),
            product_id: '23f27f9c-74d5-4d02-b810-875d64600cd9',
            name: 'Amul Taaza Toned Milk 1L',
            brand: 'Amul',
            barcode: '8901262010060',
            unit: '1 L',
            image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
            category_id: 1,
            category_name: 'Dairy',
          },
          {
            inventory_id: 'inv-3',
            price: 340,
            mrp: 360,
            quantity: 12,
            low_stock_threshold: 4,
            is_available: true,
            updated_at: new Date().toISOString(),
            product_id: '23f27f9c-74d5-4d02-b810-875d64600ce0',
            name: 'Aashirvaad Shudh Chakki Atta 5kg',
            brand: 'Aashirvaad',
            barcode: '8901030383854',
            unit: '5 kg',
            image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
            category_id: 2,
            category_name: 'Atta & Flour',
          },
        ];
        return {
          total: mockItems.length,
          items: mockItems,
        };
      }
      throw err;
    }
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

