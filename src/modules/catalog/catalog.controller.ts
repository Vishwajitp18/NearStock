import { Request, Response, NextFunction } from 'express';
import { CatalogService } from './catalog.service';
import { AuthenticatedRequest } from '../../types/auth';

const catalogService = new CatalogService();

export class CatalogController {
  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await catalogService.getCategories();
      res.status(200).json({ categories });
    } catch (err) {
      next(err);
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, category_id, limit } = req.query as any;
      const products = await catalogService.getProducts({
        q,
        category_id: category_id ? parseInt(category_id, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      res.status(200).json({ products });
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await catalogService.getProductById(id);
      res.status(200).json({ product });
    } catch (err) {
      next(err);
    }
  }

  async proposeProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await catalogService.proposeProduct({
        ...req.body,
        userId: req.user!.id,
        autoVerify: req.user!.role === 'admin',
      });
      res.status(201).json({
        message: req.user!.role === 'admin' 
          ? 'Product created and verified in catalog' 
          : 'Product suggested successfully. It will be verified by an admin.',
        product,
      });
    } catch (err) {
      next(err);
    }
  }
}

