import path from 'path';
import dotenv from 'dotenv';

// Explicitly load .env from process.cwd()
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const defaultUser = process.env.USER || 'vishwajit';
const defaultDbUrl = `postgres://${defaultUser}@localhost:5432/retail`;
const defaultRedisUrl = 'redis://:vishu@localhost:6379';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  db: {
    url: process.env.DATABASE_URL || defaultDbUrl,
  },
  redis: {
    url: process.env.REDIS_URL || defaultRedisUrl,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'hyperlocal_access_secret_key_super_secure_2026_jwt',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'hyperlocal_refresh_secret_key_super_secure_2026_jwt',
    accessExpiry: '15m',
    refreshExpiry: '30d',
  },
  meili: {
    host: process.env.MEILI_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILI_KEY || 'masterKey',
  },
  routing: {
    provider: process.env.ROUTING_PROVIDER || 'osrm',
    osrmUrl: process.env.OSRM_URL || 'http://localhost:5000',
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  otp: {
    providerKey: process.env.OTP_PROVIDER_KEY || '',
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  },
  storage: {
    s3Bucket: process.env.S3_BUCKET || '',
  },
  enableMockFallback: process.env.ENABLE_MOCK_FALLBACK !== 'false',
};
