import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { query } from '../config/db';
import { cache } from '../config/redis';

export function handleIdempotency() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string;
    if (!key) {
      return next();
    }

    const userId = req.user?.id || null;
    const redisKey = `idempotency:${key}`;

    // 1. Check Redis first
    const cached = await cache.get(redisKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        res.status(parsed.status).json(parsed.body);
        return;
      } catch (e) {
        // continue
      }
    }

    // 2. Check DB
    try {
      const { rows } = await query(
        'SELECT response_code, response_body FROM idempotency_keys WHERE idempotency_key = $1',
        [key]
      );
      if (rows.length > 0) {
        res.status(rows[0].response_code).json(rows[0].response_body);
        return;
      }
    } catch (dbErr) {
      // Continue if db check fails
    }

    // 3. Intercept response to store result
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Save asynchronously
      const statusCode = res.statusCode;
      cache.setex(redisKey, 86400, JSON.stringify({ status: statusCode, body }));
      query(
        `INSERT INTO idempotency_keys (idempotency_key, user_id, path, response_code, response_body)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [key, userId, req.originalUrl, statusCode, JSON.stringify(body)]
      ).catch(() => {});

      return originalJson(body);
    };

    next();
  };
}

