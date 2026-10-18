import { z } from 'zod';

export const addInventorySchema = z.object({
  product_id: z.string().uuid('Valid product ID is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  mrp: z.number().min(0, 'MRP must be non-negative').optional(),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').default(0),
  low_stock_threshold: z.number().int().min(0).default(5),
});

export const updateInventorySchema = z.object({
  price: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
});

export const adjustStockSchema = z.object({
  change_qty: z.number().int('Change quantity must be an integer (positive to add, negative to reduce)'),
  reason: z.enum(['restock', 'sale', 'manual_adjust', 'return', 'order', 'expired']),
});

export const bulkInventoryJsonSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      price: z.number().min(0),
      mrp: z.number().min(0).optional(),
      quantity: z.number().int().min(0),
      low_stock_threshold: z.number().int().min(0).default(5),
    })
  ).min(1, 'At least one item is required'),
});

