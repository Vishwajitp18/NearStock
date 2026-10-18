import { parse } from 'csv-parse/sync';
import { query, transaction } from '../../config/db';
import { AppError } from '../../middleware/error';
import { publishEvent } from '../../config/queue';

export class InventoryService {
  async addItem(shopId: string, data: any, actorId: string) {
    if (data.mrp && data.price > data.mrp) {
      throw new AppError('Price cannot exceed MRP (Section 11 Price Sanity)', 400, 'PRICE_EXCEEDS_MRP');
    }

    return transaction(async (client) => {
      // 1. Verify product exists
      const prodRes = await client.query('SELECT id, name FROM products WHERE id = $1', [data.product_id]);
      if (prodRes.rows.length === 0) {
        throw new AppError('Product not found in catalog', 404, 'PRODUCT_NOT_FOUND');
      }

      // 2. Insert or update inventory
      const { rows } = await client.query(
        `INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (shop_id, product_id) DO UPDATE
         SET price = EXCLUDED.price,
             mrp = EXCLUDED.mrp,
             quantity = inventory.quantity + EXCLUDED.quantity,
             low_stock_threshold = EXCLUDED.low_stock_threshold,
             updated_at = now()
         RETURNING id, shop_id, product_id, price, mrp, quantity, low_stock_threshold, is_available, updated_at`,
        [shopId, data.product_id, data.price, data.mrp || null, data.quantity, data.low_stock_threshold ?? 5]
      );

      const inv = rows[0];

      // 3. Log initial stock movement if quantity > 0
      if (data.quantity > 0) {
        await client.query(
          `INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
           VALUES ($1, $2, 'restock', $3)`,
          [inv.id, data.quantity, actorId]
        );
      }

      // Publish event
      await publishEvent('stock.updated', {
        inventoryId: inv.id,
        shopId,
        productId: inv.product_id,
        quantity: inv.quantity,
        threshold: inv.low_stock_threshold,
      });

      return inv;
    });
  }

  async updateItem(shopId: string, itemId: string, data: any, actorId: string) {
    if (data.price !== undefined && data.mrp !== undefined && data.price > data.mrp) {
      throw new AppError('Price cannot exceed MRP', 400, 'PRICE_EXCEEDS_MRP');
    }

    return transaction(async (client) => {
      const existingRes = await client.query(
        `SELECT id, price, mrp, quantity, low_stock_threshold, product_id FROM inventory WHERE id = $1 AND shop_id = $2`,
        [itemId, shopId]
      );

      if (existingRes.rows.length === 0) {
        throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
      }

      const existing = existingRes.rows[0];
      const effectiveMrp = data.mrp !== undefined ? data.mrp : existing.mrp;
      const effectivePrice = data.price !== undefined ? data.price : existing.price;

      if (effectiveMrp && effectivePrice > effectiveMrp) {
        throw new AppError('Price cannot exceed MRP', 400, 'PRICE_EXCEEDS_MRP');
      }

      const fields: string[] = ['updated_at = now()'];
      const values: any[] = [];

      if (data.price !== undefined) {
        values.push(data.price);
        fields.push(`price = $${values.length}`);
      }
      if (data.mrp !== undefined) {
        values.push(data.mrp);
        fields.push(`mrp = $${values.length}`);
      }
      if (data.low_stock_threshold !== undefined) {
        values.push(data.low_stock_threshold);
        fields.push(`low_stock_threshold = $${values.length}`);
      }
      if (data.quantity !== undefined) {
        values.push(data.quantity);
        fields.push(`quantity = $${values.length}`);
      }

      values.push(itemId);
      const itemIdParam = `$${values.length}`;
      values.push(shopId);
      const shopIdParam = `$${values.length}`;

      const { rows } = await client.query(
        `UPDATE inventory
         SET ${fields.join(', ')}
         WHERE id = ${itemIdParam} AND shop_id = ${shopIdParam}
         RETURNING id, shop_id, product_id, price, mrp, quantity, low_stock_threshold, is_available, updated_at`,
        values
      );

      const updated = rows[0];

      // If quantity was explicitly overwritten, log adjustment
      if (data.quantity !== undefined && data.quantity !== existing.quantity) {
        const diff = data.quantity - existing.quantity;
        await client.query(
          `INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
           VALUES ($1, $2, 'manual_adjust', $3)`,
          [itemId, diff, actorId]
        );
      }

      await publishEvent('stock.updated', {
        inventoryId: updated.id,
        shopId,
        productId: updated.product_id,
        quantity: updated.quantity,
        threshold: updated.low_stock_threshold,
      });

      return updated;
    });
  }

  /**
   * Atomic stock adjustment with SQL guard (Section 8)
   */
  async adjustStock(
    shopId: string,
    itemId: string,
    changeQty: number,
    reason: string,
    actorId: string
  ) {
    if (changeQty === 0) {
      throw new AppError('Adjustment quantity cannot be zero', 400, 'ZERO_CHANGE');
    }

    return transaction(async (client) => {
      let updateSql: string;
      let params: any[];

      if (changeQty < 0) {
        // Atomic deduction with safety guard: quantity >= abs(changeQty)
        const absDeduction = Math.abs(changeQty);
        updateSql = `
          UPDATE inventory
          SET quantity = quantity - $1, updated_at = now()
          WHERE id = $2 AND shop_id = $3 AND quantity >= $1
          RETURNING id, shop_id, product_id, price, mrp, quantity, low_stock_threshold, is_available, updated_at;
        `;
        params = [absDeduction, itemId, shopId];
      } else {
        // Atomic addition
        updateSql = `
          UPDATE inventory
          SET quantity = quantity + $1, updated_at = now()
          WHERE id = $2 AND shop_id = $3
          RETURNING id, shop_id, product_id, price, mrp, quantity, low_stock_threshold, is_available, updated_at;
        `;
        params = [changeQty, itemId, shopId];
      }

      const { rows } = await client.query(updateSql, params);

      if (rows.length === 0) {
        // Check if item exists to give precise error
        const check = await client.query('SELECT quantity FROM inventory WHERE id = $1 AND shop_id = $2', [itemId, shopId]);
        if (check.rows.length === 0) {
          throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
        }
        throw new AppError(
          `Insufficient stock to deduct ${Math.abs(changeQty)} units. Current stock is ${check.rows[0].quantity}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const updated = rows[0];

      // Log movement in same transaction
      await client.query(
        `INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
         VALUES ($1, $2, $3, $4)`,
        [itemId, changeQty, reason, actorId]
      );

      await publishEvent('stock.updated', {
        inventoryId: updated.id,
        shopId,
        productId: updated.product_id,
        quantity: updated.quantity,
        threshold: updated.low_stock_threshold,
      });

      return updated;
    });
  }

  async bulkUpdate(shopId: string, items: any[], actorId: string) {
    const results: any[] = [];
    for (const item of items) {
      const res = await this.addItem(shopId, item, actorId);
      results.push(res);
    }
    return { count: results.length, items: results };
  }

  async bulkUpdateCsv(shopId: string, csvBuffer: Buffer, actorId: string) {
    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const succeeded: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        let productId = row.product_id;
        if (!productId && row.barcode) {
          const prod = await query('SELECT id FROM products WHERE barcode = $1', [row.barcode]);
          if (prod.rows.length > 0) {
            productId = prod.rows[0].id;
          } else {
            throw new Error(`Product with barcode ${row.barcode} not found`);
          }
        }

        if (!productId) {
          throw new Error('product_id or barcode is required');
        }

        const price = parseFloat(row.price);
        const mrp = row.mrp ? parseFloat(row.mrp) : undefined;
        const quantity = parseInt(row.quantity, 10);
        const threshold = row.low_stock_threshold ? parseInt(row.low_stock_threshold, 10) : 5;

        const res = await this.addItem(
          shopId,
          { product_id: productId, price, mrp, quantity, low_stock_threshold: threshold },
          actorId
        );
        succeeded.push(res);
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    return {
      total: records.length,
      processed: succeeded.length,
      failed: errors.length,
      errors,
    };
  }

  async getMovements(shopId: string, itemId?: string, limit: number = 50) {
    let sql = `
      SELECT sm.id, sm.inventory_id, sm.change_qty, sm.reason, sm.created_at,
             u.name AS actor_name,
             p.name AS product_name, p.id AS product_id
      FROM stock_movements sm
      JOIN inventory i ON i.id = sm.inventory_id
      JOIN products p ON p.id = i.product_id
      LEFT JOIN users u ON u.id = sm.actor_id
      WHERE i.shop_id = $1
    `;
    const params: any[] = [shopId];

    if (itemId) {
      params.push(itemId);
      sql += ` AND sm.inventory_id = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY sm.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    return rows;
  }
}

