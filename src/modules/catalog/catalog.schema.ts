import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.number().int().positive().optional(),
  unit: z.string().min(1, 'Unit is required (e.g., 500 g, 1 L)'),
  image_url: z.string().url().optional(),
  description: z.string().optional(),
});

export const searchProductsQuerySchema = z.object({
  q: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

