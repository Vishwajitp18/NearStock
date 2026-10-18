import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AuthenticatedRequest } from '../../types/auth';

const adminService = new AdminService();

export class AdminController {
  async getShops(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, limit, offset } = req.query as any;
      const shops = await adminService.getShops(
        status,
        limit ? parseInt(limit, 10) : 50,
        offset ? parseInt(offset, 10) : 0
      );
      res.status(200).json({ count: shops.length, shops });
    } catch (err) {
      next(err);
    }
  }

  async updateShopStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, reason } = req.body;
      const id = req.params.id as string;
      const shop = await adminService.updateShopStatus(id, status, reason);
      res.status(200).json({ message: `Shop status updated to ${status}`, shop });
    } catch (err) {
      next(err);
    }
  }

  async verifyProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await adminService.verifyProduct(id);
      res.status(200).json({ message: 'Product verified successfully', product });
    } catch (err) {
      next(err);
    }
  }

  async mergeProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceProductId, targetProductId } = req.body;
      const result = await adminService.mergeProducts(sourceProductId, targetProductId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, parent_id } = req.body;
      const category = await adminService.createCategory(name, parent_id);
      res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, parent_id } = req.body;
      const id = parseInt(req.params.id as string, 10);
      const category = await adminService.updateCategory(id, name, parent_id);
      res.status(200).json({ category });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      await adminService.deleteCategory(id);
      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, limit, offset } = req.query as any;
      const users = await adminService.getUsers(
        role,
        limit ? parseInt(limit, 10) : 50,
        offset ? parseInt(offset, 10) : 0
      );
      res.status(200).json({ count: users.length, users });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { is_active } = req.body;
      const id = req.params.id as string;
      const user = await adminService.updateUserStatus(id, is_active);
      res.status(200).json({ message: 'User status updated', user });
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await adminService.getPlatformAnalytics();
      res.status(200).json(analytics);
    } catch (err) {
      next(err);
    }
  }
}

