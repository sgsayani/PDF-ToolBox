import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import type { PdfOperation } from '../models/Job.js';
import { cleanupService } from '../services/cleanup.service.js';
import { compressService } from '../services/compress.service.js';
import { cropService } from '../services/crop.service.js';
import { formService } from '../services/form.service.js';
import { jobService, type FileSummary } from '../services/job.service.js';
import { pdfService } from '../services/pdf.service.js';
import { redactService } from '../services/redact.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { translatePdfService } from '../services/translatePdf.service.js';
import { withSuffix } from '../utils/filename.js';
import type {
  CompressInput,
  CropInput,
  FillFormInput,
  MergeInput,
  OrganizeInput,
  PageNumbersInput,
  RedactInput,
  RemoveMetadataInput,
  ScannerCleanupInput,
  SignInput,
  SplitInput,
  TranslateInput,
  WatermarkInput,
} from '../validators/pdf.validators.js';
import { toFileResource } from './files.controller.js';

interface OperationDefinition<TBody> {
  operation: PdfOperation;
  /** Storage ids this operation reads, in the order the service expects them. */
  inputIds: (body: TBody) => string[];
  /** The actual document transformation. */
  transform: (inputs: Uint8Array[], body: TBody) => Promise<Uint8Array>;
  /** Name for the produced file, derived from the inputs. */
  outputName: (inputs: StoredFile[], body: TBody) => string;
}

export function summarise(file: StoredFile): FileSummary {
  return { filename: file.filename, size: file.size, pageCount: file.pageCount };
}

/**
 * Runs one PDF operation end to end.
 *
 * Every operation shares the same lifecycle — resolve inputs, transform,
 * validate and store the result, record the job, respond — so that lifecycle
 * lives here and the individual endpoints stay declarative. Controllers hold no
 * document logic; that belongs to `pdfService`.
 *
 * Exported so operations with a genuinely different input shape (images, not
 * an existing stored PDF) can reuse the same lifecycle — see
 * `images.controller.ts`.
 */
export async function executeOperation<TBody>(
  req: Request,
  res: Response,
  body: TBody,
  definition: OperationDefinition<TBody>,
): Promise<void> {
  const startedAt = Date.now();
  const userId = req.user?.id;
  let inputs: StoredFile[] = [];

  try {
    const ids = definition.inputIds(body);
    inputs = ids.map((id) => storageService.get(id));
    const data = await Promise.all(ids.map((id) => storageService.read(id)));

    const output = await definition.transform(data, body);

    // Re-parsing the result is a cheap guarantee that we never hand back a
    // document we could not read ourselves, and yields the page count.
    const metadata = await pdfService.inspect(output);

    const stored = await storageService.save({
      data: output,
      filename: definition.outputName(inputs, body),
      pageCount: metadata.pageCount,
    });

    const durationMs = Date.now() - startedAt;

    jobService.record({
      operation: definition.operation,
      status: 'succeeded',
      inputs: inputs.map(summarise),
      output: summarise(stored),
      durationMs,
      userId,
    });

    res.status(200).json({
      operation: definition.operation,
      file: toFileResource(stored),
      durationMs,
    });
  } catch (error) {
    jobService.record({
      operation: definition.operation,
      status: 'failed',
      inputs: inputs.map(summarise),
      durationMs: Date.now() - startedAt,
      errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      userId,
    });
    throw error;
  }
}

export const pdfController = {
  /**
   * Applies a whole editing session — deletions, new order and rotations — in
   * one request, so it commits atomically rather than as a chain of
   * partially-applied round trips.
   */
  organize: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as OrganizeInput;
    await executeOperation(req, res, body, {
      operation: 'organize',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { pages }) => pdfService.organize(data!, pages),
      outputName: ([file]) => withSuffix(file!.filename, 'organized'),
    });
  },

  /**
   * Extracts a subset of pages. Shares `organize`'s implementation — the
   * difference is intent, which is what the output name and history record.
   */
  split: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SplitInput;
    await executeOperation(req, res, body, {
      operation: 'split',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { pages }) => pdfService.organize(data!, pages),
      outputName: ([file]) => withSuffix(file!.filename, 'extract'),
    });
  },

  merge: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as MergeInput;
    await executeOperation(req, res, body, {
      operation: 'merge',
      inputIds: ({ fileIds }) => fileIds,
      transform: (data) => pdfService.merge(data),
      outputName: ([first]) => withSuffix(first!.filename, 'merged'),
    });
  },

  watermark: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as WatermarkInput;
    await executeOperation(req, res, body, {
      operation: 'watermark',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { text, position, opacity, fontSize, pages }) =>
        pdfService.addWatermark(data!, { text, position, opacity, fontSize, pages }),
      outputName: ([file]) => withSuffix(file!.filename, 'watermarked'),
    });
  },

  pageNumbers: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PageNumbersInput;
    await executeOperation(req, res, body, {
      operation: 'page-numbers',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { position, startNumber, pages }) =>
        pdfService.addPageNumbers(data!, { position, startNumber, pages }),
      outputName: ([file]) => withSuffix(file!.filename, 'numbered'),
    });
  },

  removeMetadata: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RemoveMetadataInput;
    await executeOperation(req, res, body, {
      operation: 'remove-metadata',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data]) => pdfService.removeMetadata(data!),
      outputName: ([file]) => withSuffix(file!.filename, 'cleaned'),
    });
  },

  sign: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SignInput;
    await executeOperation(req, res, body, {
      operation: 'sign',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { page, position, widthPercent, image }) =>
        pdfService.sign(data!, { page, position, widthPercent, image }),
      outputName: ([file]) => withSuffix(file!.filename, 'signed'),
    });
  },

  /**
   * Fills the submitted field values and flattens the form in one request —
   * the output is a normal PDF, so this fits the shared pipeline exactly like
   * every other content edit above.
   */
  fillForm: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as FillFormInput;
    await executeOperation(req, res, body, {
      operation: 'fill-form',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { values }) => formService.fill(data!, values),
      outputName: ([file]) => withSuffix(file!.filename, 'filled'),
    });
  },

  /**
   * Rebuilds selected pages as adjusted images and re-embeds them; produces a
   * normal PDF, so it fits the shared pipeline like every content edit above.
   */
  cleanup: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ScannerCleanupInput;
    await executeOperation(req, res, body, {
      operation: 'scanner-cleanup',
      inputIds: ({ fileId }) => [fileId],
      transform: (
        [data],
        { pages, grayscale, brightness, contrast, rotate, denoise, cleanBackground },
      ) => cleanupService.clean(data!, { pages, grayscale, brightness, contrast, rotate, denoise, cleanBackground }),
      outputName: ([file]) => withSuffix(file!.filename, 'enhanced'),
    });
  },

  crop: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CropInput;
    await executeOperation(req, res, body, {
      operation: 'crop',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { pages, rect }) => cropService.crop(data!, { pages, rect }),
      outputName: ([file]) => withSuffix(file!.filename, 'cropped'),
    });
  },

  redact: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RedactInput;
    await executeOperation(req, res, body, {
      operation: 'redact',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { areas }) => redactService.redact(data!, areas),
      outputName: ([file]) => withSuffix(file!.filename, 'redacted'),
    });
  },

  /**
   * Compression and translation both return more than a stored file — sizes
   * for one, detected language for the other — so neither fits
   * `executeOperation`'s fixed response shape; same lifecycle by hand.
   */
  compress: async (req: Request, res: Response): Promise<void> => {
    const { fileId, level } = req.body as CompressInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const result = await compressService.compress(data, level);
      const metadata = await pdfService.inspect(result.output);

      const stored = await storageService.save({
        data: result.output,
        filename: withSuffix(input.filename, 'compressed'),
        pageCount: metadata.pageCount,
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'compress',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(stored),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({
        operation: 'compress',
        file: toFileResource(stored),
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reduced: result.reduced,
        durationMs,
      });
    } catch (error) {
      jobService.record({
        operation: 'compress',
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  },

  translate: async (req: Request, res: Response): Promise<void> => {
    const { fileId, targetLang, sourceLang } = req.body as TranslateInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const result = await translatePdfService.translate(data, targetLang, sourceLang);

      const stored = await storageService.save({
        data: result.output,
        filename: withSuffix(input.filename, `translated-${targetLang.toLowerCase()}`),
        pageCount: result.pageCount,
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'translate',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(stored),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({
        operation: 'translate',
        file: toFileResource(stored),
        detectedSourceLang: result.detectedSourceLang,
        durationMs,
      });
    } catch (error) {
      jobService.record({
        operation: 'translate',
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  },
};
