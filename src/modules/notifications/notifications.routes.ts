import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { query } from '../../config/db';

export const notificationsRouter = Router();

const deviceTokenSchema = z.object({
  token: z.string().min(5, 'Device token is required'),
  platform: z.enum(['ios', 'android', 'web']).default('android'),
});

notificationsRouter.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { rows } = await query(
      `SELECT id, type, payload, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.status(200).json({ count: rows.length, notifications: rows });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch('/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { rows } = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [id, userId]
    );

    res.status(200).json({ success: true, notification: rows[0] });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post(
  '/device-tokens',
  authenticate,
  validate({ body: deviceTokenSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token, platform } = req.body;
      const userId = req.user!.id;

      await query(
        `INSERT INTO device_tokens (user_id, token, platform)
         VALUES ($1, $2, $3)
         ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform`,
        [userId, token, platform]
      );

      res.status(200).json({ message: 'Device token registered successfully' });
    } catch (err) {
      next(err);
    }
  }
);

