import type { Request, Response } from 'express';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { jobService } from '../services/job.service.js';
import { savedFileService } from '../services/savedFile.service.js';
import { CONTENT_TYPES, storageService } from '../services/storage.service.js';
import { usageService } from '../services/usage.service.js';
import { mongoIdParamSchema, type SaveFileInput } from '../validators/auth.validators.js';

/** Encodes a filename for Content-Disposition, per RFC 6266 / RFC 5987 — matches `files.controller.ts`. */
function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const accountController = {
  usage: async (req: Request, res: Response): Promise<void> => {
    const usage = await usageService.usageFor(req.user!.id, req.user!.plan);
    res.status(200).json(usage);
  },

  history: async (req: Request, res: Response): Promise<void> => {
    const jobs = await jobService.history(req.user!.id);
    res.status(200).json({ jobs });
  },

  deleteHistoryEntry: async (req: Request, res: Response): Promise<void> => {
    const { id } = mongoIdParamSchema.parse(req.params);
    const deleted = await jobService.deleteOne(req.user!.id, id);
    if (!deleted) {
      throw AppError.notFound(ErrorCode.NOT_FOUND, 'That history entry is no longer available.');
    }
    res.status(204).end();
  },

  clearHistory: async (req: Request, res: Response): Promise<void> => {
    await jobService.deleteAll(req.user!.id);
    res.status(204).end();
  },

  listSavedFiles: async (req: Request, res: Response): Promise<void> => {
    const files = await savedFileService.list(req.user!.id);
    res.status(200).json({ files });
  },

  /** Copies an existing (short-lived) processing result into permanent storage. */
  saveFile: async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.body as SaveFileInput;
    const stored = storageService.get(fileId);
    const data = await storageService.read(fileId);

    const saved = await savedFileService.save({
      userId: req.user!.id,
      data,
      filename: stored.filename,
      pageCount: stored.pageCount,
      kind: stored.kind,
    });

    res.status(201).json({ file: saved });
  },

  downloadSavedFile: async (req: Request, res: Response): Promise<void> => {
    const { id } = mongoIdParamSchema.parse(req.params);
    const { record, data } = await savedFileService.read(req.user!.id, id);

    res.setHeader('Content-Type', CONTENT_TYPES[record.kind]);
    res.setHeader('Content-Length', String(data.byteLength));
    res.setHeader('Content-Disposition', contentDisposition(record.filename));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(Buffer.from(data));
  },

  deleteSavedFile: async (req: Request, res: Response): Promise<void> => {
    const { id } = mongoIdParamSchema.parse(req.params);
    await savedFileService.remove(req.user!.id, id);
    res.status(204).end();
  },
};
