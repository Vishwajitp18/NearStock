import { Router } from 'express';
import { SearchController } from './search.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/auth';
import { searchRateLimiter } from '../../middleware/rateLimit';
import { searchNearMeSchema, productShopsSchema } from './search.schema';

export const searchRouter = Router();
const controller = new SearchController();

searchRouter.get(
  '/search',
  searchRateLimiter,
  optionalAuth,
  validate({ query: searchNearMeSchema }),
  controller.search
);

searchRouter.get(
  '/products/:id/shops',
  searchRateLimiter,
  optionalAuth,
  validate({ query: productShopsSchema }),
  controller.getShopsForProduct
);

