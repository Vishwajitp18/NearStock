import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { query, transaction } from '../../config/db';
import { AppError } from '../../middleware/error';
import { publishEvent } from '../../config/queue';

export const ordersRouter = Router();

const createOrderSchema = z.object({
  shop_id: z.string().uuid('Valid shop ID is required'),
  type: z.enum(['reserve_pickup', 'delivery']).default('reserve_pickup'),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive('Quantity must be at least 1'),
    })
  ).min(1, 'Order must contain at least one item'),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'accepted', 'ready', 'completed', 'cancelled', 'expired']),
});

// Create order / reserve stock
ordersRouter.post(
  '/orders',
  authenticate,
  validate({ body: createOrderSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { shop_id, type, items } = req.body;
      const customerId = req.user!.id;

      const orderResult = await transaction(async (client) => {
        // 1. Check shop
        const shopRes = await client.query('SELECT id, status, is_open_now, name FROM shops WHERE id = $1', [shop_id]);
        if (shopRes.rows.length === 0) {
          throw new AppError('Shop not found', 404, 'NOT_FOUND');
        }
        if (shopRes.rows[0].status !== 'approved' || !shopRes.rows[0].is_open_now) {
          throw new AppError('Shop is currently closed or not approved for orders', 400, 'SHOP_UNAVAILABLE');
        }

        let total = 0;
        const processedItems: any[] = [];

        // 2. Reserve / deduct stock atomically with guard (Section 8)
        for (const item of items) {
          const updateRes = await client.query(
            `UPDATE inventory
             SET quantity = quantity - $1, updated_at = now()
             WHERE shop_id = $2 AND product_id = $3 AND quantity >= $1
             RETURNING id, price, quantity`,
            [item.quantity, shop_id, item.product_id]
          );

          if (updateRes.rows.length === 0) {
            const prodRes = await client.query('SELECT name FROM products WHERE id = $1', [item.product_id]);
            const prodName = prodRes.rows[0]?.name || item.product_id;
            throw new AppError(`Item "${prodName}" does not have enough stock available`, 400, 'INSUFFICIENT_STOCK');
          }

          const invRow = updateRes.rows[0];
          const unitPrice = parseFloat(invRow.price);
          total += unitPrice * item.quantity;

          processedItems.push({
            inventoryId: invRow.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice,
            remainingStock: invRow.quantity,
          });

          // Log stock movement
          await client.query(
            `INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
             VALUES ($1, $2, 'order', $3)`,
            [invRow.id, -item.quantity, customerId]
          );
        }

        // 3. Create order
        const { rows: orderRows } = await client.query(
          `INSERT INTO orders (customer_id, shop_id, status, type, total)
           VALUES ($1, $2, 'placed', $3, $4)
           RETURNING id, customer_id, shop_id, status, type, total, created_at`,
          [customerId, shop_id, type, total]
        );
        const order = orderRows[0];

        // 4. Create order items
        for (const p of processedItems) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [order.id, p.productId, p.quantity, p.unitPrice]
          );
        }

        return { order, items: processedItems };
      });

      // Trigger background events
      await publishEvent('order.placed', {
        orderId: orderResult.order.id,
        shopId: orderResult.order.shop_id,
        customerId,
        total: orderResult.order.total,
      });

      res.status(201).json({
        message: 'Order created and stock reserved successfully',
        order: orderResult.order,
        itemsCount: orderResult.items.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get orders
ordersRouter.get('/orders', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let sql: string;
    let params: any[];

    if (role === 'shopkeeper') {
      sql = `
        SELECT o.id, o.status, o.type, o.total, o.created_at,
               s.name AS shop_name, s.id AS shop_id,
               u.name AS customer_name, u.phone AS customer_phone
        FROM orders o
        JOIN shops s ON s.id = o.shop_id
        JOIN users u ON u.id = o.customer_id
        WHERE s.owner_id = $1
        ORDER BY o.created_at DESC LIMIT 50;
      `;
      params = [userId];
    } else {
      sql = `
        SELECT o.id, o.status, o.type, o.total, o.created_at,
               s.name AS shop_name, s.id AS shop_id, s.phone AS shop_phone, s.address AS shop_address
        FROM orders o
        JOIN shops s ON s.id = o.shop_id
        WHERE o.customer_id = $1
        ORDER BY o.created_at DESC LIMIT 50;
      `;
      params = [userId];
    }

    const { rows } = await query(sql, params);
    res.status(200).json({ count: rows.length, orders: rows });
  } catch (err) {
    next(err);
  }
});

// Update order status
ordersRouter.patch(
  '/orders/:id/status',
  authenticate,
  validate({ body: updateOrderStatusSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      const updated = await transaction(async (client) => {
        const orderRes = await client.query(
          `SELECT o.id, o.status, o.shop_id, s.owner_id
           FROM orders o
           JOIN shops s ON s.id = o.shop_id
           WHERE o.id = $1`,
          [id]
        );

        if (orderRes.rows.length === 0) {
          throw new AppError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderRes.rows[0];

        // Only shop owner or admin can advance status; customer can cancel if placed
        if (req.user!.role !== 'admin' && order.owner_id !== userId && status !== 'cancelled') {
          throw new AppError('Forbidden: Only the shopkeeper can update this order status', 403, 'FORBIDDEN');
        }

        // If cancelled, return reserved stock back to inventory
        if (status === 'cancelled' && order.status !== 'cancelled') {
          const { rows: items } = await client.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
            [id]
          );

          for (const item of items) {
            await client.query(
              `UPDATE inventory
               SET quantity = quantity + $1, updated_at = now()
               WHERE shop_id = $2 AND product_id = $3`,
              [item.quantity, order.shop_id, item.product_id]
            );
          }
        }

        const { rows } = await client.query(
          `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status, total, created_at`,
          [status, id]
        );

        return rows[0];
      });

      res.status(200).json({ message: `Order status updated to ${status}`, order: updated });
    } catch (err) {
      next(err);
    }
  }
);

