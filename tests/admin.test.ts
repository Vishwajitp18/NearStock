import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Admin Module', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Admin login (+919999999999)
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999999999', otp: '123456' });

    adminToken = loginRes.body.accessToken;
  });

  it('should list pending shops in admin review queue', async () => {
    const res = await request(app)
      .get('/api/v1/admin/shops?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('shops');
    expect(Array.isArray(res.body.shops)).toBe(true);
  });

  it('should approve a shop', async () => {
    const shopsRes = await request(app)
      .get('/api/v1/admin/shops?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    if (shopsRes.body.shops.length > 0) {
      const targetShopId = shopsRes.body.shops[0].id;

      const approveRes = await request(app)
        .patch(`/api/v1/admin/shops/${targetShopId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.shop.status).toBe('approved');
    }
  });

  it('should retrieve overall platform analytics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('shops');
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('inventory');
    expect(res.body).toHaveProperty('topSearches');
  });
});

