import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import { AppError, ErrorCode } from '../errors/AppError.js';

/** Field-level messages, keyed by dotted path, safe to render in a form. */
function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * Validates and *replaces* `req.body` with the parsed result, so controllers
 * receive fully typed, coerced input and never touch raw request data.
 */
export function validateBody<Schema extends ZodTypeAny>(schema: Schema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'Some of the options were invalid.', {
          details: { fields: fieldErrors(result.error) },
        }),
      );
      return;
    }

    req.body = result.data as z.infer<Schema>;
    next();
  };
}
