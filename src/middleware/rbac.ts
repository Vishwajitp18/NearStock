import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/auth';
import { AppError } from './error';
import { query } from '../config/db';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Allowed roles: ${allowedRoles.join(', ')}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

export async function requireShopOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  // Admins bypass shop owner checks
  if (req.user.role === 'admin') {
    return next();
  }

  const shopId = req.params.shopId || req.params.id;
  if (!shopId) {
    return next(new AppError('Shop ID is required', 400, 'BAD_REQUEST'));
  }

  try {
    const { rows } = await query('SELECT owner_id FROM shops WHERE id = $1', [shopId]);
    if (rows.length === 0) {
      return next(new AppError('Shop not found', 404, 'NOT_FOUND'));
    }

    if (rows[0].owner_id !== req.user.id) {
      return next(new AppError('Forbidden: You do not own this shop', 403, 'FORBIDDEN'));
    }

    next();
  } catch (err) {
    next(err);
  }
}

