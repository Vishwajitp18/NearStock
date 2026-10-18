import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required (at least 10 digits)'),
  role: z.enum(['customer', 'shopkeeper', 'admin']).optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  otp: z.string().min(4, 'OTP must be at least 4 digits'),
  name: z.string().min(2, 'Name must have at least 2 characters').optional(),
  role: z.enum(['customer', 'shopkeeper', 'admin']).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const passwordLoginSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

