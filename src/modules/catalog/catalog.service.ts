import { query } from '../../config/db';
import { cache } from '../../config/redis';
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
  }

  async getProducts(params: { q?: string; category_id?: number; limit?: number }) {
    const limit = params.limit || 20;

    if (params.q) {
      return searchProducts(params.q, limit);
    }

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
  }

  async getProductById(id: string) {
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

