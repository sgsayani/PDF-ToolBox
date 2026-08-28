import type { Request, Response } from 'express';

import { isAppError } from '../errors/AppError.js';
import { jobService, type FileSummary } from '../services/job.service.js';
import { securityService } from '../services/security.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { withSuffix } from '../utils/filename.js';
import type { ProtectInput } from '../validators/pdf.validators.js';
import { toFileResource } from './files.controller.js';

function summarise(file: StoredFile): FileSummary {
  return { filename: file.filename, size: file.size, pageCount: file.pageCount };
}

/**
 * Password protection lives outside `pdf.controller.ts`'s shared
 * `executeOperation` helper.
 *
 * That helper re-parses every operation's output with `pdfService.inspect`
 * as a cheap "did we produce something we can read back" guarantee — which
 * is exactly what protecting a file must *not* be able to do. This mirrors
 * `executeOperation`'s shape (timing, job recording, response body) for the
 * one operation that can't share its implementation.
 */
export const securityController = {
  protect: async (req: Request, res: Response): Promise<void> => {
    const { fileId, password } = req.body as ProtectInput;
    const startedAt = Date.now();
    let input: StoredFile | undefined;

    try {
      input = storageService.get(fileId);
      const data = await storageService.read(fileId);

      const { output, pageCount } = await securityService.protect(data, password);

      const stored = await storageService.save({
        data: output,
        filename: withSuffix(input.filename, 'protected'),
        pageCount,
      });

      const durationMs = Date.now() - startedAt;

      jobService.record({
        operation: 'protect',
        status: 'succeeded',
        inputs: [summarise(input)],
        output: summarise(stored),
        durationMs,
      });

      res.status(200).json({ operation: 'protect', file: toFileResource(stored), durationMs });
    } catch (error) {
      jobService.record({
        operation: 'protect',
        status: 'failed',
        inputs: input ? [summarise(input)] : [],
        durationMs: Date.now() - startedAt,
        errorCode: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      });
      throw error;
    }
  },
};
