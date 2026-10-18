import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Customer Search Module (Where is this item near me?)', () => {
  const originLat = 12.9716;
  const originLng = 77.5946;

  it('should search for "Amul butter 500g" and return shops in Bangalore sorted by best', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({
        q: 'Amul butter 500g',
        lat: originLat,
        lng: originLng,
        radius: 3000,
        sort: 'best',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('query');
    expect(res.body).toHaveProperty('product');
    expect(res.body.product.name).toContain('Amul Butter');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThanOrEqual(2);

    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty('shop');
    expect(firstResult).toHaveProperty('price');
    expect(firstResult).toHaveProperty('distance_m');
    expect(firstResult).toHaveProperty('eta_seconds');
    expect(firstResult).toHaveProperty('tags');
    expect(firstResult.in_stock).toBe(true);
  });

  it('should return shop with minimum price when sorted by cheapest', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({
        q: 'Amul butter 500g',
        lat: originLat,
        lng: originLng,
        radius: 3000,
        sort: 'cheapest',
      });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(2);

    // Verify first result has the lowest price
    const prices = res.body.results.map((r: any) => r.price);
    expect(prices[0]).toBe(Math.min(...prices));
    // Verify it contains the 'cheapest' tag
    expect(res.body.results[0].tags).toContain('cheapest');
  });

  it('should return shop with minimum distance when sorted by nearest', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({
        q: 'Amul butter 500g',
        lat: originLat,
        lng: originLng,
        radius: 3000,
        sort: 'nearest',
      });

    expect(res.status).toBe(200);
    const distances = res.body.results.map((r: any) => r.distance_m);
    expect(distances[0]).toBe(Math.min(...distances));
    expect(res.body.results[0].tags).toContain('nearest');
  });

  it('should auto-expand radius if initial radius has no shops (Section 14)', async () => {
    // Search from ~2.6km away with 500m radius so initial candidates = 0
    const res = await request(app)
      .get('/api/v1/search')
      .query({
        q: 'Amul butter 500g',
        lat: 12.9950,
        lng: originLng,
        radius: 500,
        sort: 'best',
      });

    expect(res.status).toBe(200);
    // Should auto-expand and find shops at larger radius
    expect(res.body.radius_auto_expanded).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.radius_m).toBeGreaterThan(500);
  });
});

