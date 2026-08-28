import type { Request, Response } from 'express';

import { AppError, ErrorCode, isAppError } from '../errors/AppError.js';
import { jobService } from '../services/job.service.js';
import { pdfService } from '../services/pdf.service.js';
import { storageService } from '../services/storage.service.js';
import { wordImportService } from '../services/wordImport.service.js';
import { sanitizeFilename, withSuffix } from '../utils/filename.js';
import { toFileResource } from './files.controller.js';

/**
 * Word → PDF is a single round trip: unlike every PDF-first tool, there is no
 * "open document" to convert against, and unlike images → PDF there is only
 * ever one file with nothing to reorder — so upload and conversion happen in
 * one request instead of an upload step plus a separate operation.
 */
export const documentsController = {
  toPdf: async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw AppError.badRequest(ErrorCode.NO_FILE_UPLOADED, 'Please choose a Word document to upload.');
    }

    const { buffer, originalname } = req.file;
    const startedAt = Date.now();
    const inputSummary = { filename: sanitizeFilename(originalname), size: buffer.byteLength, pageCount: 0 };

    if (buffer.byteLength === 0) {
      throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'This file is empty.');
    }

    try {
      const pdfBytes = await wordImportService.toPdf(buffer);

      // Re-parsing the result is the same cheap guarantee `executeOperation`
      // applies to every other operation's output.
      const metadata = await pdfService.inspect(pdfBytes);

      const stored = await storageService.save({
        data: pdfBytes,
        filename: withSuffix(sanitizeFilename(originalname), 'converted'),
        pageCount: metadata.pageCount,
        kind: 'pdf',
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'word-to-pdf',
        status: 'succeeded',
        inputs: [inputSummary],
        output: { filename: stored.filename, size: stored.size, pageCount: stored.pageCount },
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({ operation: 'word-to-pdf', file: toFileResource(stored), durationMs });
    } catch (error) {
      jobService.record({
        operation: 'word-to-pdf',
        status: 'failed',
        inputs: [inputSummary],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  },
};
