import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { planLimits, usageService } from '../services/usage.service.js';

/**
 * Gates processing behind a signed-in user's daily plan allowance.
 *
 * A no-op for anonymous requests — this app has always let anyone process a
 * PDF without an account, and that stays true; only a request that already
 * carries a session is checked. Placed alongside `processingRateLimiter` on
 * each processing router, the same way that middleware already is.
 */
export function enforceUsageLimit(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next();
      return;
    }

    const limits = planLimits(req.user.plan);
    usageService
      .processedToday(req.user.id)
      .then((processedToday) => {
        if (processedToday >= limits.maxProcessingPerDay) {
          next(
            AppError.tooManyRequests(
              ErrorCode.USAGE_LIMIT_EXCEEDED,
              `You've reached today's limit of ${limits.maxProcessingPerDay} operations on the free plan. Try again tomorrow.`,
              { details: { maxProcessingPerDay: limits.maxProcessingPerDay } },
            ),
          );
          return;
        }
        next();
      })
      .catch(next);
  };
}
