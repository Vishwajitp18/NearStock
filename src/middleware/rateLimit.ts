import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 120,
  skip: () => isTest,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after a minute',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  skip: () => isTest,
  message: {
    error: {
      code: 'OTP_RATE_LIMITED',
      message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 60,
  skip: () => isTest,
  message: {
    error: {
      code: 'SEARCH_RATE_LIMITED',
      message: 'Search query rate limit exceeded, please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
