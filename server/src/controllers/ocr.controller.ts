import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import { jobService } from '../services/job.service.js';
import { ocrService } from '../services/ocr.service.js';
import { pdfService } from '../services/pdf.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { withSuffix } from '../utils/filename.js';
import type { OcrInput } from '../validators/pdf.validators.js';
import { summarise } from './pdf.controller.js';
import { toFileResource } from './files.controller.js';

/**
 * OCR returns per-page text alongside (optionally) a new stored PDF, which no
 * existing response shape covers — like `convertController`, it follows the
 * shared resolve/transform/store/record/respond lifecycle by hand.
 */
export const ocrController = {
  run: async (req: Request, res: Response): Promise<void> => {
    const { fileId, pages, language, generateSearchablePdf } = req.body as OcrInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const result = await ocrService.recognize(data, { pages, language, generateSearchablePdf });

      let stored: StoredFile | null = null;
      if (result.searchablePdf) {
        const metadata = await pdfService.inspect(result.searchablePdf);
        stored = await storageService.save({
          data: result.searchablePdf,
          filename: withSuffix(input.filename, 'ocr'),
          pageCount: metadata.pageCount,
        });
      }

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'ocr',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: stored ? summarise(stored) : null,
        durationMs,
      });

      res.status(200).json({
        operation: 'ocr',
        pages: result.pages,
        meanConfidence: result.meanConfidence,
        lowQuality: result.lowQuality,
        file: stored ? toFileResource(stored) : null,
        durationMs,
      });
    } catch (error) {
      jobService.record({
        operation: 'ocr',
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      });
      throw error;
    }
  },
};
