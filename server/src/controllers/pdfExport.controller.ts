import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import type { PdfOperation } from '../models/Job.js';
import { jobService } from '../services/job.service.js';
import { pdfExportService } from '../services/pdfExport.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { stripExtension, withSuffix } from '../utils/filename.js';
import type { ToCsvInput, ToExcelInput, ToHtmlInput, ToPptxInput } from '../validators/pdf.validators.js';
import { summarise } from './pdf.controller.js';
import { toFileResource } from './files.controller.js';

/**
 * PDF → Excel/CSV/HTML/PowerPoint all produce something that isn't a PDF, so
 * — like `convertController` (PDF → JPG/Word) — none of them fit the shared
 * `executeOperation` pipeline, which re-validates its output by re-parsing
 * it as a PDF. Same lifecycle by hand instead: resolve input, transform,
 * store, record, respond.
 */
function makeExporter<TBody extends { fileId: string }>(
  operation: PdfOperation,
  kind: 'xlsx' | 'csv' | 'html' | 'pptx',
  transform: (data: Uint8Array, input: StoredFile) => Promise<Uint8Array | string>,
  suffix: string,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.body as TBody;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const result = await transform(data, input);
      const bytes = typeof result === 'string' ? Buffer.from(result, 'utf-8') : result;

      const stored = await storageService.save({
        data: bytes,
        filename: withSuffix(input.filename, suffix, kind),
        pageCount: input.pageCount,
        kind,
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation,
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(stored),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({ operation, file: toFileResource(stored), durationMs });
    } catch (error) {
      jobService.record({
        operation,
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  };
}

export const pdfExportController = {
  toExcel: makeExporter<ToExcelInput>('to-excel', 'xlsx', (data) => pdfExportService.toExcel(data), 'table'),
  toCsv: makeExporter<ToCsvInput>('to-csv', 'csv', (data) => pdfExportService.toCsv(data), 'table'),
  toHtml: makeExporter<ToHtmlInput>(
    'to-html',
    'html',
    (data, input) => pdfExportService.toHtml(data, stripExtension(input.filename)),
    'converted',
  ),
  toPptx: makeExporter<ToPptxInput>('to-pptx', 'pptx', (data) => pdfExportService.toPptx(data), 'converted'),
};
