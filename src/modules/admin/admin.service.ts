import { query, transaction } from '../../config/db';
import { cache } from '../../config/redis';
import { publishEvent } from '../../config/queue';
import { AppError } from '../../middleware/error';
import { syncProductToSearchIndex } from '../../lib/searchSync';

export class AdminService {
  async getShops(status?: string, limit: number = 50, offset: number = 0) {
    let sql = `
      SELECT s.id, s.name, s.description, s.phone, s.address, s.city, s.pincode,
             ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
             s.status, s.is_open_now, s.delivery_available, s.avg_rating, s.created_at,
             u.id AS owner_id, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
      FROM shops s
      JOIN users u ON u.id = s.owner_id
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` WHERE s.status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);
    sql += ` ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    return rows;
  }

  async updateShopStatus(shopId: string, status: string, reason?: string) {
    const { rows } = await query(
      `UPDATE shops
       SET status = $1
       WHERE id = $2
       RETURNING id, name, owner_id, status`,
      [status, shopId]
    );

    if (rows.length === 0) {
      throw new AppError('Shop not found', 404, 'NOT_FOUND');
    }

    const shop = rows[0];

    // Invalidate caches
    await cache.invalidatePattern('shops:*');
    await cache.invalidatePattern(`shop:${shopId}:*`);

    // Publish event
    if (status === 'approved') {
      await publishEvent('shop.approved', {
        shopId: shop.id,
        ownerId: shop.owner_id,
        shopName: shop.name,
      });
    } else if (status === 'suspended') {
      await publishEvent('shop.suspended', {
        shopId: shop.id,
        ownerId: shop.owner_id,
        shopName: shop.name,
        reason,
      });
    }

    return shop;
  }

  async verifyProduct(productId: string) {
    const { rows } = await query(
      `UPDATE products
       SET is_verified = TRUE
       WHERE id = $1
       RETURNING id, name, brand, barcode, unit, image_url, description, category_id, is_verified`,
      [productId]
    );

    if (rows.length === 0) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    const product = rows[0];
    await syncProductToSearchIndex(product);
    return product;
  }

  /**
   * Section 14 Edge Case: Admin merge tool for duplicate products
   */
  async mergeProducts(sourceProductId: string, targetProductId: string) {
    if (sourceProductId === targetProductId) {
      throw new AppError('Cannot merge product into itself', 400, 'SAME_PRODUCT');
    }

    return transaction(async (client) => {
      // 1. Verify target exists
      const targetRes = await client.query('SELECT id, name FROM products WHERE id = $1', [targetProductId]);
      if (targetRes.rows.length === 0) {
        throw new AppError('Target product not found', 404, 'TARGET_NOT_FOUND');
      }

      // 2. Fetch all inventory rows under source product
      const { rows: sourceInvs } = await client.query(
        'SELECT id, shop_id, price, mrp, quantity, low_stock_threshold FROM inventory WHERE product_id = $1',
        [sourceProductId]
      );

      for (const inv of sourceInvs) {
        // Check if shop already has target product
        const { rows: targetInvs } = await client.query(
          'SELECT id, quantity, price FROM inventory WHERE shop_id = $1 AND product_id = $2',
          [inv.shop_id, targetProductId]
        );

        if (targetInvs.length > 0) {
          // Merge quantities and update price to lower of the two
          const targetInv = targetInvs[0];
          const newQty = targetInv.quantity + inv.quantity;
          const bestPrice = Math.min(parseFloat(targetInv.price), parseFloat(inv.price));

          await client.query(
            `UPDATE inventory
             SET quantity = $1, price = $2, updated_at = now()
             WHERE id = $3`,
            [newQty, bestPrice, targetInv.id]
          );

          // Delete source inventory entry
          await client.query('DELETE FROM inventory WHERE id = $1', [inv.id]);
        } else {
          // Re-point source inventory to target product
          await client.query(
            `UPDATE inventory
             SET product_id = $1, updated_at = now()
             WHERE id = $2`,
            [targetProductId, inv.id]
          );
        }
      }

      // Re-point search logs
      await client.query('UPDATE search_logs SET product_id = $1 WHERE product_id = $2', [targetProductId, sourceProductId]);

      // Delete source product
      await client.query('DELETE FROM products WHERE id = $1', [sourceProductId]);

      // Invalidate caches
      await cache.invalidatePattern(`search:${sourceProductId}:*`);
      await cache.invalidatePattern(`search:${targetProductId}:*`);

      return {
        message: `Successfully merged product ${sourceProductId} into ${targetProductId} (${targetRes.rows[0].name})`,
        mergedInventoriesCount: sourceInvs.length,
      };
    });
  }

  async createCategory(name: string, parentId?: number | null) {
    const { rows } = await query(
      `INSERT INTO categories (name, parent_id)
       VALUES ($1, $2)
       RETURNING id, name, parent_id`,
      [name.trim(), parentId || null]
    );
    await cache.del('categories:tree');
    return rows[0];
  }

  async updateCategory(id: number, name: string, parentId?: number | null) {
    const { rows } = await query(
      `UPDATE categories
       SET name = $1, parent_id = $2
       WHERE id = $3
       RETURNING id, name, parent_id`,
      [name.trim(), parentId || null, id]
    );
    if (rows.length === 0) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }
    await cache.del('categories:tree');
    return rows[0];
  }

  async deleteCategory(id: number) {
    await query('DELETE FROM categories WHERE id = $1', [id]);
    await cache.del('categories:tree');
    return { success: true };
  }

  async getUsers(role?: string, limit: number = 50, offset: number = 0) {
    let sql = `SELECT id, role, name, phone, email, is_active, created_at FROM users`;
    const params: any[] = [];
    if (role) {
      params.push(role);
      sql += ` WHERE role = $${params.length}`;
    }
    params.push(limit);
    params.push(offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return rows;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const { rows } = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, phone, role, is_active`,
      [isActive, userId]
    );
    if (rows.length === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return rows[0];
  }

  async getPlatformAnalytics() {
    const shopStats = await query(`
      SELECT 
        COUNT(*) AS total_shops,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_shops,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_shops,
        COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_shops,
        COUNT(*) FILTER (WHERE is_open_now = TRUE AND status = 'approved') AS open_now_shops
      FROM shops;
    `);

    const productStats = await query(`
      SELECT 
        COUNT(*) AS total_products,
        COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified_products,
        COUNT(*) FILTER (WHERE is_verified = FALSE) AS unverified_products
      FROM products;
    `);

    const inventoryStats = await query(`
      SELECT 
        COUNT(*) AS total_stock_records,
        COALESCE(SUM(quantity * price), 0) AS total_market_value,
        COALESCE(SUM(quantity), 0) AS total_quantity_in_stock
      FROM inventory;
    `);

    const searchStats = await query(`
      SELECT query, COUNT(*) as count
      FROM search_logs
      WHERE query IS NOT NULL
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10;
    `);

    return {
      shops: shopStats.rows[0],
      products: productStats.rows[0],
      inventory: inventoryStats.rows[0],
      topSearches: searchStats.rows,
    };
  }
}

