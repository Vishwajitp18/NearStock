import { Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { AuthenticatedRequest } from '../../types/auth';
import { AppError } from '../../middleware/error';

const inventoryService = new InventoryService();

export class InventoryController {
  async addItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.params.id as string;
      const item = await inventoryService.addItem(shopId, req.body, req.user!.id);
      res.status(201).json({ message: 'Item added to shop inventory', item });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const item = await inventoryService.updateItem(
        shopId,
        itemId,
        req.body,
        req.user!.id
      );
      res.status(200).json({ message: 'Inventory item updated', item });
    } catch (err) {
      next(err);
    }
  }

  async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const { change_qty, reason } = req.body;
      const item = await inventoryService.adjustStock(
        shopId,
        itemId,
        change_qty,
        reason,
        req.user!.id
      );
      res.status(200).json({ message: 'Stock adjusted successfully', item });
    } catch (err) {
      next(err);
    }
  }

  async bulkUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.params.id as string;
      if (req.is('multipart/form-data')) {
        if (!req.file || !req.file.buffer) {
          throw new AppError('No CSV file uploaded in "file" field', 400, 'FILE_MISSING');
        }
        const result = await inventoryService.bulkUpdateCsv(shopId, req.file.buffer, req.user!.id);
        res.status(200).json(result);
        return;
      }

      // JSON bulk update
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        throw new AppError('JSON body must include "items" array', 400, 'INVALID_PAYLOAD');
      }

      const result = await inventoryService.bulkUpdate(shopId, items, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMovements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.params.id as string;
      const { itemId, limit } = req.query as any;
      const movements = await inventoryService.getMovements(
        shopId,
        itemId,
        limit ? parseInt(limit, 10) : 50
      );
      res.status(200).json({ count: movements.length, movements });
    } catch (err) {
      next(err);
    }
  }
}

