import { z } from 'zod';

export const registerShopSchema = z.object({
  name: z.string().min(2, 'Shop name is required'),
  description: z.string().optional(),
  phone: z.string().min(10, 'Shop contact phone is required'),
  address: z.string().min(5, 'Shop address is required'),
  city: z.string().optional(),
  pincode: z.string().optional(),
  lat: z.number().min(-90).max(90, 'Valid latitude required'),
  lng: z.number().min(-180).max(180, 'Valid longitude required'),
  delivery_available: z.boolean().optional(),
  delivery_radius_m: z.number().int().positive().optional(),
});

export const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  phone: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  is_open_now: z.boolean().optional(),
  delivery_available: z.boolean().optional(),
  delivery_radius_m: z.number().int().positive().nullable().optional(),
});

export const setShopHoursSchema = z.object({
  hours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      opens_at: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format HH:MM or HH:MM:SS').nullable().optional(),
      closes_at: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format HH:MM or HH:MM:SS').nullable().optional(),
      is_closed: z.boolean().default(false),
    })
  ).min(1, 'At least one day schedule is required'),
});

export const nearbyShopsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50000).default(5000), // in meters
  category: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const shopInventoryQuerySchema = z.object({
  q: z.string().optional(),
  category: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

