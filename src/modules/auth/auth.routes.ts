import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { otpRateLimiter } from '../../middleware/rateLimit';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  passwordLoginSchema,
} from './auth.schema';

export const authRouter = Router();
const controller = new AuthController();

authRouter.post(
  '/auth/send-otp',
  otpRateLimiter,
  validate({ body: sendOtpSchema }),
  controller.sendOtp
);

authRouter.post(
  '/auth/verify-otp',
  validate({ body: verifyOtpSchema }),
  controller.verifyOtp
);

authRouter.post(
  '/auth/login',
  validate({ body: passwordLoginSchema }),
  controller.login
);

authRouter.post(
  '/auth/refresh',
  validate({ body: refreshSchema }),
  controller.refresh
);

authRouter.get(
  '/me',
  authenticate,
  controller.getMe
);

