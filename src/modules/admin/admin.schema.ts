import { z } from 'zod';

export const updateShopStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'suspended', 'rejected']),
  reason: z.string().optional(),
});

export const mergeProductsSchema = z.object({
  sourceProductId: z.string().uuid('Source product ID is required'),
  targetProductId: z.string().uuid('Target product ID is required'),
});

export const adminCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  parent_id: z.number().int().positive().nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

