import path from 'node:path';

import multer, { MulterError } from 'multer';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  // Some browsers and OSes send a generic type for drag-and-dropped files.
  'application/octet-stream',
  'binary/octet-stream',
]);

/**
 * Uploads are buffered in memory: files are size-capped, validated, and either
 * written to the temporary store or discarded within a single request, so there
 * is no benefit to a second trip through the filesystem.
 */
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1,
    fields: 8,
    // Guards against a client streaming an unbounded "filename".
    fieldSize: 4096,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    // First-pass screening only. The authoritative check is the PDF header and
    // parse performed in the controller — never trust a client-supplied type.
    if (extension !== '.pdf' || !ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      callback(
        AppError.badRequest(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          'Only PDF files can be uploaded.',
          { details: { received: extension || file.mimetype } },
        ),
      );
      return;
    }

    callback(null, true);
  },
});

function toAppError(error: unknown): unknown {
  if (!(error instanceof MulterError)) return error;

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return AppError.payloadTooLarge(
        ErrorCode.FILE_TOO_LARGE,
        `This file is larger than the ${env.MAX_FILE_SIZE_MB} MB limit.`,
        { details: { maxFileSizeMb: env.MAX_FILE_SIZE_MB }, cause: error },
      );
    case 'LIMIT_FILE_COUNT':
      return AppError.badRequest(ErrorCode.TOO_MANY_FILES, 'Please upload one file at a time.', {
        cause: error,
      });
    case 'LIMIT_UNEXPECTED_FILE':
      return AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'Unexpected file field in the upload.',
        { cause: error },
      );
    default:
      return AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'This upload could not be read.', {
        cause: error,
      });
  }
}

/** Accepts a single PDF on the `file` field, normalising multer's errors. */
export function singlePdfUpload(): RequestHandler {
  const handler = multerUpload.single('file');

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (error: unknown) => {
      if (error) {
        next(toAppError(error));
        return;
      }
      next();
    });
  };
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  // Some browsers and OSes send a generic type for drag-and-dropped files.
  'application/octet-stream',
  'binary/octet-stream',
]);

/** Same shape as the PDF uploader, scoped to JPG/PNG for the images-to-PDF tool. */
const multerImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1,
    fields: 8,
    fieldSize: 4096,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!IMAGE_EXTENSIONS.has(extension) || !IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(
        AppError.badRequest(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          'Only JPG and PNG images can be uploaded.',
          { details: { received: extension || file.mimetype } },
        ),
      );
      return;
    }

    callback(null, true);
  },
});

/** Accepts a single JPG or PNG on the `file` field, normalising multer's errors. */
export function singleImageUpload(): RequestHandler {
  const handler = multerImageUpload.single('file');

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (error: unknown) => {
      if (error) {
        next(toAppError(error));
        return;
      }
      next();
    });
  };
}
