import type { Request, Response } from 'express';

import { AppError, ErrorCode, isAppError } from '../errors/AppError.js';
import { documentConvertService } from '../services/documentConvert.service.js';
import { jobService, type FileSummary } from '../services/job.service.js';
import { pdfService } from '../services/pdf.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import type { PdfOperation } from '../models/Job.js';
import { sanitizeFilename, withSuffix } from '../utils/filename.js';
import { toFileResource } from './files.controller.js';

function summarise(file: StoredFile): FileSummary {
  return { filename: file.filename, size: file.size, pageCount: file.pageCount };
}

/**
 * One request per conversion: upload and convert happen together, exactly
 * like `documentsController.toPdf` (Word → PDF) — there is no "open
 * document" for a source format the PDF workspace can't itself open.
 */
function makeConverter(
  operation: PdfOperation,
  convert: (data: Uint8Array, originalname: string) => Promise<Uint8Array>,
  noFileMessage: string,
) {
  return async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw AppError.badRequest(ErrorCode.NO_FILE_UPLOADED, noFileMessage);
    }

    const { buffer, originalname } = req.file;
    const startedAt = Date.now();
    const inputSummary = { filename: sanitizeFilename(originalname), size: buffer.byteLength, pageCount: 0 };

    if (buffer.byteLength === 0) {
      throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'This file is empty.');
    }

    try {
      const pdfBytes = await convert(buffer, originalname);

      // Re-parsing the result is the same cheap guarantee every other
      // operation in this app applies to its own output.
      const metadata = await pdfService.inspect(pdfBytes);

      const stored = await storageService.save({
        data: pdfBytes,
        filename: withSuffix(sanitizeFilename(originalname), 'converted'),
        pageCount: metadata.pageCount,
        kind: 'pdf',
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation,
        status: 'succeeded',
        inputs: [inputSummary],
        output: summarise(stored),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({ operation, file: toFileResource(stored), durationMs });
    } catch (error) {
      jobService.record({
        operation,
        status: 'failed',
        inputs: [inputSummary],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  };
}

export const documentConvertController = {
  excelToPdf: makeConverter(
    'excel-to-pdf',
    (data) => documentConvertService.excelToPdf(data),
    'Please choose an Excel file to upload.',
  ),
  csvToPdf: makeConverter(
    'csv-to-pdf',
    (data) => documentConvertService.csvToPdf(data),
    'Please choose a CSV file to upload.',
  ),
  pptxToPdf: makeConverter(
    'pptx-to-pdf',
    (data) => documentConvertService.pptxToPdf(data),
    'Please choose a PowerPoint file to upload.',
  ),
  htmlToPdf: makeConverter(
    'html-to-pdf',
    (data) => documentConvertService.htmlToPdf(data),
    'Please choose an HTML file to upload.',
  ),
  textToPdf: makeConverter(
    'text-to-pdf',
    (data, originalname) => documentConvertService.textToPdf(data, originalname),
    'Please choose a text file to upload.',
  ),
};
