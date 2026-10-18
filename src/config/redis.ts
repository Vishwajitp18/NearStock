import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../lib/logger';

class InMemoryCache {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matching: string[] = [];
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        matching.push(key);
      }
    }
    return matching;
  }
}

let redisClient: Redis | null = null;
const memoryFallback = new InMemoryCache();
let useMemoryFallback = false;

try {
  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis reconnection failed 3 times, falling back to in-memory store');
        useMemoryFallback = true;
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    useMemoryFallback = false;
  });

  redisClient.on('error', (err) => {
    logger.warn(`Redis connection error: ${err.message}. Using cache fallback.`);
    useMemoryFallback = true;
  });
} catch (err: any) {
  logger.warn(`Failed to initialize Redis client: ${err?.message}`);
  useMemoryFallback = true;
}

export const cache = {
  async get(key: string): Promise<string | null> {
    if (!useMemoryFallback && redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.get(key);
      } catch (err) {
        return memoryFallback.get(key);
      }
    }
    return memoryFallback.get(key);
  },

  async set(key: string, value: string): Promise<'OK'> {
    if (!useMemoryFallback && redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.set(key, value);
      } catch (err) {
        return memoryFallback.set(key, value);
      }
    }
    return memoryFallback.set(key, value);
  },

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (!useMemoryFallback && redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.setex(key, seconds, value);
      } catch (err) {
        return memoryFallback.setex(key, seconds, value);
      }
    }
    return memoryFallback.setex(key, seconds, value);
  },

  async del(...keys: string[]): Promise<number> {
    if (!useMemoryFallback && redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.del(...keys);
      } catch (err) {
        return memoryFallback.del(...keys);
      }
    }
    return memoryFallback.del(...keys);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (!useMemoryFallback && redisClient && redisClient.status === 'ready') {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        const keys = await memoryFallback.keys(pattern);
        if (keys.length > 0) {
          await memoryFallback.del(...keys);
        }
      }
    } catch (err: any) {
      logger.warn(`Failed to invalidate cache pattern ${pattern}: ${err?.message}`);
    }
  },

  getRawClient(): Redis | null {
    return redisClient;
  },
};

