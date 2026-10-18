import { Router } from 'express';
import { ShopsController } from './shops.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireRole, requireShopOwner } from '../../middleware/rbac';
import {
  registerShopSchema,
  updateShopSchema,
  setShopHoursSchema,
  nearbyShopsQuerySchema,
  shopInventoryQuerySchema,
} from './shops.schema';

export const shopsRouter = Router();
const controller = new ShopsController();

// Public routes
shopsRouter.get(
  '/shops/nearby',
  validate({ query: nearbyShopsQuerySchema }),
  controller.getNearbyShops
);

shopsRouter.get('/shops/:id', controller.getShopById);

shopsRouter.get(
  '/shops/:id/inventory',
  validate({ query: shopInventoryQuerySchema }),
  controller.getShopInventory
);

// Shopkeeper & Admin routes
shopsRouter.post(
  '/shops',
  authenticate,
  requireRole(['shopkeeper', 'admin']),
  validate({ body: registerShopSchema }),
  controller.registerShop
);

shopsRouter.patch(
  '/shops/:id',
  authenticate,
  requireShopOwner,
  validate({ body: updateShopSchema }),
  controller.updateShop
);

shopsRouter.put(
  '/shops/:id/hours',
  authenticate,
  requireShopOwner,
  validate({ body: setShopHoursSchema }),
  controller.setShopHours
);

shopsRouter.get(
  '/shops/:id/alerts',
  authenticate,
  requireShopOwner,
  controller.getShopAlerts
);

shopsRouter.get(
  '/shops/:id/analytics',
  authenticate,
  requireShopOwner,
  controller.getShopAnalytics
);

