import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/db';
import { AppError } from '../../middleware/error';

export const favouritesRouter = Router();

// Save favourite shop
favouritesRouter.post('/favourites/:shopId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params;
    const userId = req.user!.id;

    const shopCheck = await query('SELECT id FROM shops WHERE id = $1', [shopId]);
    if (shopCheck.rows.length === 0) {
      throw new AppError('Shop not found', 404, 'NOT_FOUND');
    }

    await query(
      `INSERT INTO favourite_shops (user_id, shop_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, shop_id) DO NOTHING`,
      [userId, shopId]
    );

    res.status(200).json({ message: 'Shop added to favourites' });
  } catch (err) {
    next(err);
  }
});

// Remove favourite shop
favouritesRouter.delete('/favourites/:shopId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params;
    const userId = req.user!.id;

    await query(
      `DELETE FROM favourite_shops WHERE user_id = $1 AND shop_id = $2`,
      [userId, shopId]
    );

    res.status(200).json({ message: 'Shop removed from favourites' });
  } catch (err) {
    next(err);
  }
});

// Get user's favourite shops
favouritesRouter.get('/favourites', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { rows } = await query(
      `SELECT s.id, s.name, s.description, s.phone, s.address, s.city, s.pincode,
              ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
              s.avg_rating, s.is_open_now, s.delivery_available
       FROM favourite_shops f
       JOIN shops s ON s.id = f.shop_id
       WHERE f.user_id = $1`,
      [userId]
    );

    res.status(200).json({ count: rows.length, favourites: rows });
  } catch (err) {
    next(err);
  }
});

