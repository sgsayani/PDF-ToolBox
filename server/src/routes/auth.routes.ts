import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authController } from '../controllers/auth.controller.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { requireAuth, requireDatabase } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.validators.js';

export const authRouter = Router();

authRouter.use(requireDatabase);

/**
 * Tighter than the general processing rate limit: credential guessing is the
 * threat model here, not a slow client uploading a big file.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        'Too many attempts. Please wait a few minutes and try again.',
      ),
    );
  },
});

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
authRouter.patch(
  '/profile',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);
