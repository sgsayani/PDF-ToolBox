/**
 * Stable, machine-readable error codes returned to API clients.
 *
 * The client maps these to human-readable copy, so codes must not change
 * meaning once released.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_PDF: 'INVALID_PDF',
  INVALID_IMAGE: 'INVALID_IMAGE',
  ENCRYPTED_PDF: 'ENCRYPTED_PDF',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_EXPIRED: 'FILE_EXPIRED',
  PAGE_OUT_OF_RANGE: 'PAGE_OUT_OF_RANGE',
  EMPTY_RESULT: 'EMPTY_RESULT',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppErrorOptions {
  /** Extra machine-readable context surfaced to the client (never internals). */
  details?: Record<string, unknown>;
  /** Underlying error, logged server-side only. */
  cause?: unknown;
}

/**
 * An error that is safe to surface to the client.
 *
 * Anything thrown that is *not* an AppError is treated as an unexpected
 * failure: logged with full detail, reported generically.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;
  override readonly cause: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.cause = options.cause;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(code: ErrorCode, message: string, options?: AppErrorOptions): AppError {
    return new AppError(400, code, message, options);
  }

  static notFound(code: ErrorCode, message: string, options?: AppErrorOptions): AppError {
    return new AppError(404, code, message, options);
  }

  static payloadTooLarge(code: ErrorCode, message: string, options?: AppErrorOptions): AppError {
    return new AppError(413, code, message, options);
  }

  static unprocessable(code: ErrorCode, message: string, options?: AppErrorOptions): AppError {
    return new AppError(422, code, message, options);
  }

  static internal(message: string, options?: AppErrorOptions): AppError {
    return new AppError(500, ErrorCode.INTERNAL_ERROR, message, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
