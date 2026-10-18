import { Router } from 'express';
import multer from 'multer';
import { InventoryController } from './inventory.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireShopOwner } from '../../middleware/rbac';
import { handleIdempotency } from '../../middleware/idempotency';
import {
  addInventorySchema,
  updateInventorySchema,
  adjustStockSchema,
} from './inventory.schema';

export const inventoryRouter = Router();
const controller = new InventoryController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

inventoryRouter.post(
  '/shops/:id/inventory',
  authenticate,
  requireShopOwner,
  handleIdempotency(),
  validate({ body: addInventorySchema }),
  controller.addItem
);

inventoryRouter.patch(
  '/shops/:id/inventory/:itemId',
  authenticate,
  requireShopOwner,
  handleIdempotency(),
  validate({ body: updateInventorySchema }),
  controller.updateItem
);

inventoryRouter.post(
  '/shops/:id/inventory/:itemId/adjust',
  authenticate,
  requireShopOwner,
  handleIdempotency(),
  validate({ body: adjustStockSchema }),
  controller.adjustStock
);

inventoryRouter.post(
  '/shops/:id/inventory/bulk',
  authenticate,
  requireShopOwner,
  handleIdempotency(),
  upload.single('file'),
  controller.bulkUpdate
);

inventoryRouter.get(
  '/shops/:id/inventory/movements',
  authenticate,
  requireShopOwner,
  controller.getMovements
);

