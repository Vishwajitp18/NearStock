import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { query, transaction } from '../../config/db';
import { AppError } from '../../middleware/error';

export const reviewsRouter = Router();

const createReviewSchema = z.object({
  shop_id: z.string().uuid('Valid shop ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().optional(),
});

reviewsRouter.post(
  '/reviews',
  authenticate,
  validate({ body: createReviewSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { shop_id, rating, comment } = req.body;
      const userId = req.user!.id;

      const shopCheck = await query('SELECT id FROM shops WHERE id = $1', [shop_id]);
      if (shopCheck.rows.length === 0) {
        throw new AppError('Shop not found', 404, 'NOT_FOUND');
      }

      const review = await transaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO reviews (shop_id, user_id, rating, comment)
           VALUES ($1, $2, $3, $4)
           RETURNING id, shop_id, user_id, rating, comment, created_at`,
          [shop_id, userId, rating, comment || null]
        );

        // Recalculate average rating on shop
        await client.query(
          `UPDATE shops
           SET avg_rating = (
             SELECT ROUND(AVG(rating)::numeric, 1)
             FROM reviews
             WHERE shop_id = $1
           )
           WHERE id = $1`,
          [shop_id]
        );

        return rows[0];
      });

      res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (err) {
      next(err);
    }
  }
);

reviewsRouter.get(
  '/shops/:id/reviews',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rows } = await query(
        `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.shop_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [id]
      );

      res.status(200).json({ count: rows.length, reviews: rows });
    } catch (err) {
      next(err);
    }
  }
);

