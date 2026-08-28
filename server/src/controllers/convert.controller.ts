import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import { jobService } from '../services/job.service.js';
import { renderService } from '../services/render.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { wordExportService } from '../services/wordExport.service.js';
import { sanitizeFilename, stripExtension, withSuffix } from '../utils/filename.js';
import { zipFiles } from '../utils/zip.js';
import type { ToJpgInput, ToWordInput } from '../validators/pdf.validators.js';
import { summarise } from './pdf.controller.js';
import { toFileResource } from './files.controller.js';

/**
 * PDF → JPG and PDF → Word both convert a stored PDF into something that
 * isn't a PDF, so — like `security.controller.ts`'s `protect` — neither can
 * go through `pdf.controller.ts`'s shared `executeOperation`, which
 * re-validates every result by re-parsing it as a PDF. `toJpg` also produces
 * *several* files rather than one, which no existing response shape covers.
 * Both still follow the same lifecycle by hand: resolve input, transform,
 * store, record, respond.
 */
export const convertController = {
  toJpg: async (req: Request, res: Response): Promise<void> => {
    const { fileId, pages } = req.body as ToJpgInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);
      const rasterized = await renderService.rasterizePages(data, pages);
      const baseName = stripExtension(sanitizeFilename(input.filename));

      const named = rasterized.map((page) => ({
        name: `${baseName}-page-${page.pageNumber}.jpg`,
        jpeg: page.jpeg,
      }));

      const files = await Promise.all(
        named.map(({ name, jpeg }) =>
          storageService.save({ data: jpeg, filename: name, pageCount: 1, kind: 'jpg' }),
        ),
      );

      // A ZIP only makes sense once there is more than one file to bundle.
      let zip: StoredFile | null = null;
      if (named.length > 1) {
        const archive = await zipFiles(named.map(({ name, jpeg }) => ({ name, data: jpeg })));
        zip = await storageService.save({
          data: archive,
          filename: `${baseName}-pages.zip`,
          pageCount: named.length,
          kind: 'zip',
        });
      }

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'to-jpg',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(zip ?? files[0]!),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({
        operation: 'to-jpg',
        files: files.map((file) => toFileResource(file)),
        zip: zip ? toFileResource(zip) : null,
        durationMs,
      });
    } catch (error) {
      jobService.record({
        operation: 'to-jpg',
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
        userId: req.user?.id,
      });
      throw error;
    }
  },

  toWord: async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.body as ToWordInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const { pages } = await renderService.extractText(data);
      const docxBytes = await wordExportService.fromPages(pages);

      const stored = await storageService.save({
        data: docxBytes,
        filename: withSuffix(input.filename, 'converted', 'docx'),
        pageCount: pages.length,
        kind: 'docx',
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'to-word',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(stored),
        durationMs,
        userId: req.user?.id,
      });

      res.status(200).json({ operation: 'to-word', file: toFileResource(stored), durationMs });
    } catch (error) {
      jobService.record({
        operation: 'to-word',
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
