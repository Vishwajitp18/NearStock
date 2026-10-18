import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createProductSchema, searchProductsQuerySchema } from './catalog.schema';

export const catalogRouter = Router();
const controller = new CatalogController();

catalogRouter.get('/categories', controller.getCategories);

catalogRouter.get(
  '/products',
  validate({ query: searchProductsQuerySchema }),
  controller.getProducts
);

catalogRouter.get('/products/:id', controller.getProductById);

catalogRouter.post(
  '/products',
  authenticate,
  validate({ body: createProductSchema }),
  controller.proposeProduct
);

