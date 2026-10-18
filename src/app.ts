import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler, AppError } from './middleware/error';

import { authRouter } from './modules/auth/auth.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { shopsRouter } from './modules/shops/shops.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { searchRouter } from './modules/search/search.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { favouritesRouter } from './modules/favourites/favourites.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';

export const app = express();

// Security and standard middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general API rate limiter
app.use('/api/', apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI Documentation
try {
  const swaggerPath = path.resolve(__dirname, '../openapi.yaml');
  const swaggerDocument = YAML.load(swaggerPath);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  // If openapi.yaml is not in relative path during test, try root
  try {
    const rootSwagger = YAML.load(path.resolve(process.cwd(), 'openapi.yaml'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(rootSwagger));
  } catch (err) {}
}

// Mount API v1 Routers
const apiPrefix = '/api/v1';
app.use(apiPrefix, authRouter);
app.use(apiPrefix, catalogRouter);
app.use(apiPrefix, shopsRouter);
app.use(apiPrefix, inventoryRouter);
app.use(apiPrefix, searchRouter);
app.use(apiPrefix, adminRouter);
app.use(apiPrefix, favouritesRouter);
app.use(apiPrefix, reviewsRouter);
app.use(apiPrefix, ordersRouter);
app.use(apiPrefix, notificationsRouter);

// 404 Handler
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// Global Centralized Error Handler
app.use(errorHandler);

