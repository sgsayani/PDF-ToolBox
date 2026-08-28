import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';

/**
 * Caps how often a single client can trigger PDF work, which is the only
 * genuinely expensive thing this API does.
 */
export const processingRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Route through the shared error format instead of the plain-text default.
  handler: (_req, _res, next) => {
    next(
      new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        'That was a lot of requests in a short time. Please wait a moment and try again.',
      ),
    );
  },
});
