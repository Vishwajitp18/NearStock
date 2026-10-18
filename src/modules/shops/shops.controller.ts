import { Request, Response, NextFunction } from 'express';
import { ShopsService } from './shops.service';
import { AuthenticatedRequest } from '../../types/auth';

const shopsService = new ShopsService();

export class ShopsController {
  async registerShop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await shopsService.registerShop(req.user!.id, req.body);
      res.status(201).json({
        message: 'Shop registered successfully and is pending admin approval',
        shop,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateShop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const shop = await shopsService.updateShop(id, req.body);
      res.status(200).json({ message: 'Shop updated successfully', shop });
    } catch (err) {
      next(err);
    }
  }

  async setShopHours(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const hours = await shopsService.setShopHours(id, req.body.hours);
      res.status(200).json({ message: 'Shop hours updated successfully', hours });
    } catch (err) {
      next(err);
    }
  }

  async getNearbyShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, category, limit } = req.query as any;
      const shops = await shopsService.getNearbyShops({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: parseInt(radius, 10),
        category: category ? parseInt(category, 10) : undefined,
        limit: parseInt(limit, 10),
      });
      res.status(200).json({ count: shops.length, shops });
    } catch (err) {
      next(err);
    }
  }

  async getShopById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const shop = await shopsService.getShopById(id);
      res.status(200).json({ shop });
    } catch (err) {
      next(err);
    }
  }

  async getShopInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { q, category, limit, offset } = req.query as any;
      const result = await shopsService.getShopInventory(id, {
        q,
        category: category ? parseInt(category, 10) : undefined,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getShopAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const alerts = await shopsService.getShopAlerts(id);
      res.status(200).json({ count: alerts.length, alerts });
    } catch (err) {
      next(err);
    }
  }

  async getShopAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const analytics = await shopsService.getShopAnalytics(id);
      res.status(200).json(analytics);
    } catch (err) {
      next(err);
    }
  }
}

