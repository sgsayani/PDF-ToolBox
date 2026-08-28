import type { Request, Response } from 'express';

import { looksLikeJpeg, looksLikePng, pdfService } from '../services/pdf.service.js';
import { storageService } from '../services/storage.service.js';
import { sanitizeFilename, withSuffix } from '../utils/filename.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import type { ImagesToPdfInput } from '../validators/pdf.validators.js';
import { executeOperation } from './pdf.controller.js';
import { toFileResource } from './files.controller.js';

/** Detects whether uploaded bytes are a JPEG or a PNG, for the stored file's kind. */
function detectImageKind(data: Uint8Array): 'jpg' | 'png' {
  return looksLikeJpeg(data) ? 'jpg' : 'png';
}

export const imagesController = {
  /** Accepts one JPG or PNG and puts it in the temporary store, for later use by images-to-pdf. */
  upload: async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw AppError.badRequest(ErrorCode.NO_FILE_UPLOADED, 'Please choose an image to upload.');
    }

    const { buffer, originalname } = req.file;

    if (buffer.byteLength === 0) {
      throw AppError.badRequest(ErrorCode.INVALID_IMAGE, 'This file is empty.');
    }
    if (!looksLikeJpeg(buffer) && !looksLikePng(buffer)) {
      throw AppError.badRequest(
        ErrorCode.INVALID_IMAGE,
        "This file doesn't look like a JPG or PNG image.",
      );
    }

    const stored = await storageService.save({
      data: buffer,
      filename: sanitizeFilename(originalname),
      // Images don't have "pages"; 1 keeps the field meaningful for the
      // shared `ApiFile` shape without inventing a parallel type just for this.
      pageCount: 1,
      kind: detectImageKind(buffer),
    });

    res.status(201).json({ file: toFileResource(stored) });
  },

  /** Combines the given images, in order, into a single new PDF. */
  toPdf: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ImagesToPdfInput;
    await executeOperation(req, res, body, {
      operation: 'images-to-pdf',
      inputIds: ({ fileIds }) => fileIds,
      transform: (data, { fileIds }) =>
        pdfService.fromImages(
          data.map((bytes, index) => ({
            data: bytes,
            filename: storageService.get(fileIds[index]!).filename,
          })),
        ),
      outputName: ([first]) => withSuffix(first!.filename, 'converted'),
    });
  },
};
