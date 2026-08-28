import type { Request, Response } from 'express';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { pdfService } from '../services/pdf.service.js';
import { renderService } from '../services/render.service.js';
import { storageService, type StoredFile } from '../services/storage.service.js';
import { sanitizeFilename } from '../utils/filename.js';
import { fileIdParamSchema } from '../validators/pdf.validators.js';

/** Shape returned to the client for any stored working file. */
export function toFileResource(file: StoredFile) {
  return {
    id: file.id,
    filename: file.filename,
    size: file.size,
    pageCount: file.pageCount,
    kind: file.kind,
    expiresAt: file.expiresAt.toISOString(),
  };
}

/** Encodes a filename for Content-Disposition, per RFC 6266 / RFC 5987. */
function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const filesController = {
  /**
   * Accepts one PDF, verifies it really is a readable PDF, and puts it in the
   * temporary store. Returns the page structure so the client can show a
   * summary without parsing the file a second time.
   */
  upload: async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw AppError.badRequest(ErrorCode.NO_FILE_UPLOADED, 'Please choose a PDF to upload.');
    }

    const { buffer, originalname } = req.file;

    if (buffer.byteLength === 0) {
      throw AppError.badRequest(ErrorCode.INVALID_PDF, 'This file is empty.');
    }

    // Authoritative validation: parse it. A renamed file cannot get past this.
    const metadata = await pdfService.inspect(buffer);

    const stored = await storageService.save({
      data: buffer,
      filename: sanitizeFilename(originalname),
      pageCount: metadata.pageCount,
    });

    res.status(201).json({ file: toFileResource(stored), pages: metadata.pages });
  },

  /** Streams a stored file back as a download. */
  download: async (req: Request, res: Response): Promise<void> => {
    const { id } = fileIdParamSchema.parse(req.params);
    const file = storageService.get(id);
    const data = await storageService.read(id);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', String(data.byteLength));
    res.setHeader('Content-Disposition', contentDisposition(file.filename));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(Buffer.from(data));
  },

  /** Lets the client release a working file as soon as it is finished with it. */
  remove: async (req: Request, res: Response): Promise<void> => {
    const { id } = fileIdParamSchema.parse(req.params);
    await storageService.remove(id);
    res.status(204).end();
  },

  /** Reads a stored file's document metadata without changing it. */
  metadata: async (req: Request, res: Response): Promise<void> => {
    const { id } = fileIdParamSchema.parse(req.params);
    const data = await storageService.read(id);
    const metadata = await pdfService.readMetadata(data);
    res.status(200).json({ metadata });
  },

  /**
   * Reads a stored file's text layer without changing it. "Download TXT" and
   * "Copy text" both work entirely from this response on the client — the
   * text is never written back to the server as a separate file.
   */
  extractedText: async (req: Request, res: Response): Promise<void> => {
    const { id } = fileIdParamSchema.parse(req.params);
    const data = await storageService.read(id);
    const extracted = await renderService.extractText(data);
    res.status(200).json(extracted);
  },
};
