import { Router } from 'express';
import { AdminController } from './admin.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  updateShopStatusSchema,
  mergeProductsSchema,
  adminCategorySchema,
  updateUserStatusSchema,
} from './admin.schema';

export const adminRouter = Router();
const controller = new AdminController();

adminRouter.use(authenticate, requireRole(['admin']));

// Shops approval & moderation
adminRouter.get('/admin/shops', controller.getShops);
adminRouter.patch(
  '/admin/shops/:id/status',
  validate({ body: updateShopStatusSchema }),
  controller.updateShopStatus
);

// Products management & merge tool
adminRouter.post('/admin/products/:id/verify', controller.verifyProduct);
adminRouter.post(
  '/admin/products/merge',
  validate({ body: mergeProductsSchema }),
  controller.mergeProducts
);

// Category CRUD
adminRouter.post(
  '/admin/categories',
  validate({ body: adminCategorySchema }),
  controller.createCategory
);
adminRouter.put(
  '/admin/categories/:id',
  validate({ body: adminCategorySchema }),
  controller.updateCategory
);
adminRouter.delete('/admin/categories/:id', controller.deleteCategory);

// Users management
adminRouter.get('/admin/users', controller.getUsers);
adminRouter.patch(
  '/admin/users/:id/status',
  validate({ body: updateUserStatusSchema }),
  controller.updateUserStatus
);

// Platform stats
adminRouter.get('/admin/analytics', controller.getAnalytics);

