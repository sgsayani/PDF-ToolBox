import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import type { PdfOperation } from '../models/Job.js';
import { jobService, type FileSummary } from '../services/job.service.js';
import { pdfService } from '../services/pdf.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { withSuffix } from '../utils/filename.js';
import type {
  MergeInput,
  OrganizeInput,
  PageNumbersInput,
  RemoveMetadataInput,
  SignInput,
  SplitInput,
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
  res: Response,
  body: TBody,
  definition: OperationDefinition<TBody>,
): Promise<void> {
  const startedAt = Date.now();
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
    await executeOperation(res, body, {
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
    await executeOperation(res, body, {
      operation: 'split',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { pages }) => pdfService.organize(data!, pages),
      outputName: ([file]) => withSuffix(file!.filename, 'extract'),
    });
  },

  merge: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as MergeInput;
    await executeOperation(res, body, {
      operation: 'merge',
      inputIds: ({ fileIds }) => fileIds,
      transform: (data) => pdfService.merge(data),
      outputName: ([first]) => withSuffix(first!.filename, 'merged'),
    });
  },

  watermark: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as WatermarkInput;
    await executeOperation(res, body, {
      operation: 'watermark',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { text, position, opacity, fontSize, pages }) =>
        pdfService.addWatermark(data!, { text, position, opacity, fontSize, pages }),
      outputName: ([file]) => withSuffix(file!.filename, 'watermarked'),
    });
  },

  pageNumbers: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PageNumbersInput;
    await executeOperation(res, body, {
      operation: 'page-numbers',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { position, startNumber, pages }) =>
        pdfService.addPageNumbers(data!, { position, startNumber, pages }),
      outputName: ([file]) => withSuffix(file!.filename, 'numbered'),
    });
  },

  removeMetadata: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RemoveMetadataInput;
    await executeOperation(res, body, {
      operation: 'remove-metadata',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data]) => pdfService.removeMetadata(data!),
      outputName: ([file]) => withSuffix(file!.filename, 'cleaned'),
    });
  },

  sign: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SignInput;
    await executeOperation(res, body, {
      operation: 'sign',
      inputIds: ({ fileId }) => [fileId],
      transform: ([data], { page, position, widthPercent, image }) =>
        pdfService.sign(data!, { page, position, widthPercent, image }),
      outputName: ([file]) => withSuffix(file!.filename, 'signed'),
    });
  },
};
