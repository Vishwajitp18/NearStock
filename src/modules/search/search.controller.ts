import { Response, NextFunction } from 'express';
import { SearchService } from './search.service';
import { AuthenticatedRequest } from '../../types/auth';
import { CatalogService } from '../catalog/catalog.service';

const searchService = new SearchService();
const catalogService = new CatalogService();

export class SearchController {
  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, lat, lng, radius, sort } = req.query as any;
      const result = await searchService.searchNearby(
        {
          q,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: radius ? parseInt(radius, 10) : 3000,
          sort: sort || 'best',
        },
        req.user?.id
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getShopsForProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, sort } = req.query as any;
      const id = req.params.id as string;
      const product = await catalogService.getProductById(id);
      const result = await searchService.findShopsForProduct(
        product,
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseInt(radius, 10) : 3000,
        sort || 'best',
        product.name,
        req.user?.id
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

