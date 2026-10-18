import { z } from 'zod';

export const searchNearMeSchema = z.object({
  q: z.string().min(1, 'Search term "q" is required'),
  lat: z.coerce.number().min(-90).max(90, 'Valid latitude is required'),
  lng: z.coerce.number().min(-180).max(180, 'Valid longitude is required'),
  radius: z.coerce.number().int().min(100).max(50000).default(3000), // default 3km
  sort: z.enum(['nearest', 'fastest', 'cheapest', 'best']).default('best'),
});

export const productShopsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Valid latitude is required'),
  lng: z.coerce.number().min(-180).max(180, 'Valid longitude is required'),
  radius: z.coerce.number().int().min(100).max(50000).default(3000),
  sort: z.enum(['nearest', 'fastest', 'cheapest', 'best']).default('best'),
});

