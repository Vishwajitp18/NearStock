import { query } from '../../config/db';
import { cache } from '../../config/redis';
import { config } from '../../config/env';
import { AppError } from '../../middleware/error';
import { searchProducts, syncProductToSearchIndex } from '../../lib/searchSync';

export interface CategoryNode {
  id: number;
  name: string;
  parent_id: number | null;
  children?: CategoryNode[];
}

export class CatalogService {
  async getCategories(): Promise<CategoryNode[]> {
    const cacheKey = 'categories:tree';
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    try {
      const { rows } = await query(
        `SELECT id, name, parent_id FROM categories ORDER BY name ASC`
      );

      // Build hierarchy tree
      const map = new Map<number, CategoryNode>();
      const roots: CategoryNode[] = [];

      rows.forEach((cat) => {
        map.set(cat.id, { ...cat, children: [] });
      });

      rows.forEach((cat) => {
        const node = map.get(cat.id)!;
        if (cat.parent_id && map.has(cat.parent_id)) {
          map.get(cat.parent_id)!.children!.push(node);
        } else {
          roots.push(node);
        }
      });

      await cache.setex(cacheKey, 3600, JSON.stringify(roots));
      return roots;
    } catch (err: any) {
      if (config.enableMockFallback) {
        const mockCategories: CategoryNode[] = [
          { id: 1, name: 'Dairy & Eggs', parent_id: null, children: [] },
          { id: 2, name: 'Atta, Rice & Grains', parent_id: null, children: [] },
          { id: 3, name: 'Snacks & Packaged Food', parent_id: null, children: [] },
          { id: 4, name: 'Pharmacy & Wellness', parent_id: null, children: [] },
          { id: 5, name: 'Beverages & Soft Drinks', parent_id: null, children: [] },
          { id: 6, name: 'Personal Care', parent_id: null, children: [] },
        ];
        return mockCategories;
      }
      throw err;
    }
  }

  async getProducts(params: { q?: string; category_id?: number; limit?: number }) {
    const limit = params.limit || 20;

    if (params.q) {
      return searchProducts(params.q, limit);
    }

    try {
      let sql = `
        SELECT p.id, p.name, p.brand, p.barcode, p.unit, p.image_url, p.description,
               p.category_id, c.name AS category_name, p.is_verified, p.created_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_verified = TRUE
      `;
      const values: any[] = [];

      if (params.category_id) {
        values.push(params.category_id);
        sql += ` AND p.category_id = $${values.length}`;
      }

      values.push(limit);
      sql += ` ORDER BY p.name ASC LIMIT $${values.length}`;

      const { rows } = await query(sql, values);
      return rows;
    } catch (err: any) {
      if (config.enableMockFallback) {
        return [
          {
            id: '23f27f9c-74d5-4d02-b810-875d64600cd8',
            name: 'Amul Butter 500g',
            brand: 'Amul',
            barcode: '8901262010053',
            unit: '500 g',
            image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
            description: 'Pasteurised table butter made from pure milk',
            category_id: 1,
            category_name: 'Dairy & Eggs',
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          {
            id: '23f27f9c-74d5-4d02-b810-875d64600cd9',
            name: 'Amul Taaza Toned Milk 1L',
            brand: 'Amul',
            barcode: '8901262010060',
            unit: '1 L',
            image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
            description: 'Homogenised toned milk',
            category_id: 1,
            category_name: 'Dairy & Eggs',
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          {
            id: '23f27f9c-74d5-4d02-b810-875d64600ce0',
            name: 'Aashirvaad Shudh Chakki Atta 5kg',
            brand: 'Aashirvaad',
            barcode: '8901030383854',
            unit: '5 kg',
            image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
            description: '100% whole wheat flour ground to perfection',
            category_id: 2,
            category_name: 'Atta, Rice & Grains',
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          {
            id: '23f27f9c-74d5-4d02-b810-875d64600ce1',
            name: 'Maggi 2-Minute Instant Noodles 280g',
            brand: 'Nestle',
            barcode: '8901058852325',
            unit: '280 g',
            image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400',
            description: 'Classic masala instant noodles pack of 4',
            category_id: 3,
            category_name: 'Snacks & Packaged Food',
            is_verified: true,
            created_at: new Date().toISOString(),
          },
        ];
      }
      throw err;
    }
  }

  async getProductById(id: string) {
    try {
      const { rows } = await query(
        `SELECT p.id, p.name, p.brand, p.barcode, p.unit, p.image_url, p.description,
                p.category_id, c.name AS category_name, p.is_verified, p.created_at
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id = $1`,
        [id]
      );

      if (rows.length === 0) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
      }

      return rows[0];
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (config.enableMockFallback) {
        return {
          id,
          name: 'Amul Butter 500g',
          brand: 'Amul',
          barcode: '8901262010053',
          unit: '500 g',
          image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
          description: 'Pasteurised table butter made from pure milk fat',
          category_id: 1,
          category_name: 'Dairy & Eggs',
          is_verified: true,
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async proposeProduct(data: {
    name: string;
    brand?: string;
    barcode?: string;
    category_id?: number;
    unit: string;
    image_url?: string;
    description?: string;
    userId: string;
    autoVerify?: boolean;
  }) {
    // Edge case (Section 14): barcode uniqueness check
    if (data.barcode) {
      const existing = await query('SELECT id, name FROM products WHERE barcode = $1', [data.barcode]);
      if (existing.rows.length > 0) {
        throw new AppError(
          `Product with barcode "${data.barcode}" already exists: ${existing.rows[0].name}`,
          409,
          'DUPLICATE_BARCODE'
        );
      }
    }

    const isVerified = data.autoVerify === true;

    const { rows } = await query(
      `INSERT INTO products (name, brand, barcode, category_id, unit, image_url, description, created_by, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, brand, barcode, category_id, unit, image_url, description, is_verified, created_at`,
      [
        data.name.trim(),
        data.brand?.trim() || null,
        data.barcode?.trim() || null,
        data.category_id || null,
        data.unit.trim(),
        data.image_url || null,
        data.description || null,
        data.userId,
        isVerified,
      ]
    );

    const product = rows[0];
    if (isVerified) {
      await syncProductToSearchIndex(product);
    }

    return product;
  }
}

