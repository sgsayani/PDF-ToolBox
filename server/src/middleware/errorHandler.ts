import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError, ErrorCode, isAppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(ErrorCode.NOT_FOUND, `No route matches ${req.method} ${req.path}.`));
}

function normalise(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof ZodError) {
    return AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'Some of the options were invalid.', {
      cause: error,
    });
  }

  // Body parser rejects oversized or malformed JSON with a `type` marker.
  if (error && typeof error === 'object' && 'type' in error) {
    const type = (error as { type?: string }).type;
    if (type === 'entity.too.large') {
      return AppError.payloadTooLarge(ErrorCode.FILE_TOO_LARGE, 'This request was too large.', {
        cause: error,
      });
    }
    if (type === 'entity.parse.failed') {
      return AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'This request could not be read.', {
        cause: error,
      });
    }
  }

  return AppError.internal('Something went wrong on our end. Please try again.', { cause: error });
}

/**
 * Terminal error middleware.
 *
 * Clients receive a stable code and a sentence written for a person; stack
 * traces and library messages stay in the server log.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = normalise(error);
  const cause = appError.cause ?? error;

  const logContext = {
    method: req.method,
    path: req.path,
    status: appError.statusCode,
    code: appError.code,
    detail: cause instanceof Error ? cause.stack ?? cause.message : String(cause),
  };

  if (appError.statusCode >= 500) {
    logger.error(appError.message, logContext);
  } else {
    logger.debug(`Rejected request: ${appError.message}`, logContext);
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  // Surface the underlying reason in development only, to aid debugging.
  if (!env.isProduction && appError.statusCode >= 500 && cause instanceof Error) {
    body.error.details = { ...body.error.details, developerMessage: cause.message };
  }

  res.status(appError.statusCode).json(body);
}
