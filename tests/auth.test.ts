import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Auth Module', () => {
  const testPhone = '+919777777771'; // Rahul Verma from seed

  it('should send OTP to phone number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: testPhone });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('expiresAt');
  });

  it('should verify OTP and return tokens', async () => {
    // In test/dev environment, master OTP is '123456'
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.phone).toBe(testPhone);
  });

  it('should fail with invalid OTP', async () => {
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: testPhone });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('should refresh access token using valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, otp: '123456' });

    const { refreshToken } = loginRes.body;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
  });

  it('should return current authenticated user profile', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, otp: '123456' });

    const { accessToken } = loginRes.body;

    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.phone).toBe(testPhone);
  });
});

