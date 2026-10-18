import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';

describe('Inventory Module (Section 8 Stock Correctness & Concurrency)', () => {
  let shopkeeperToken: string;
  let shopId: string;
  let itemId: string;
  let productId: string;

  beforeAll(async () => {
    // Log in shopkeeper Ramesh Sharma (+919888888881)
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919888888881', otp: '123456' });

    shopkeeperToken = loginRes.body.accessToken;

    // Get their shop
    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${shopkeeperToken}`);

    shopId = meRes.body.shops[0].id;

    // Get an inventory item from their shop
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`);

    itemId = invRes.body.items[0].inventory_id;
    productId = invRes.body.items[0].product_id;
  });

  it('should atomically adjust stock (+5 units) and log stock movement', async () => {
    const initialQtyRes = await query('SELECT quantity FROM inventory WHERE id = $1', [itemId]);
    const initialQty = initialQtyRes.rows[0].quantity;

    const res = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/${itemId}/adjust`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        change_qty: 5,
        reason: 'restock',
      });

    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(initialQty + 5);

    // Verify stock_movements row
    const moveRes = await query(
      `SELECT change_qty, reason FROM stock_movements WHERE inventory_id = $1 ORDER BY id DESC LIMIT 1`,
      [itemId]
    );
    expect(moveRes.rows[0].change_qty).toBe(5);
    expect(moveRes.rows[0].reason).toBe('restock');
  });

  it('should atomically deduct stock (-2 units) with safety guard', async () => {
    const initialQtyRes = await query('SELECT quantity FROM inventory WHERE id = $1', [itemId]);
    const initialQty = initialQtyRes.rows[0].quantity;

    const res = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/${itemId}/adjust`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        change_qty: -2,
        reason: 'sale',
      });

    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(initialQty - 2);
  });

  it('should reject stock deduction if requested amount exceeds current quantity', async () => {
    const res = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/${itemId}/adjust`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        change_qty: -999999, // much larger than in stock
        reason: 'sale',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('should enforce idempotency when Idempotency-Key header is provided (Section 8)', async () => {
    const idempotencyKey = `idemp-test-${Date.now()}`;

    // First request
    const res1 = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/${itemId}/adjust`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        change_qty: 1,
        reason: 'manual_adjust',
      });

    expect(res1.status).toBe(200);
    const qtyAfterFirst = res1.body.item.quantity;

    // Retry request with exact same idempotency key (simulating mobile network retry)
    const res2 = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/${itemId}/adjust`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        change_qty: 1,
        reason: 'manual_adjust',
      });

    expect(res2.status).toBe(200);
    // Quantity should NOT have incremented a second time!
    expect(res2.body.item.quantity).toBe(qtyAfterFirst);
  });

  it('should reject price exceeding MRP (Section 11 Price Sanity)', async () => {
    const res = await request(app)
      .patch(`/api/v1/shops/${shopId}/inventory/${itemId}`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({
        mrp: 100,
        price: 150, // exceeds mrp!
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRICE_EXCEEDS_MRP');
  });
});

