import { PDFDocument as SecurePdfDocument } from '@cantoo/pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { pdfService } from './pdf.service.js';

/**
 * Password protection, kept isolated in its own service and its own PDF
 * library.
 *
 * `pdf-lib` — used everywhere else in this app — cannot write encrypted PDFs;
 * it only reads them (and only when told to ignore the encryption). Adding a
 * real password therefore uses `@cantoo/pdf-lib`, an actively maintained fork
 * that adds AES-256 encryption support on top of the same API. It is used
 * nowhere else in the codebase, so this is the one place that dependency
 * matters.
 */
export interface ProtectResult {
  output: Uint8Array;
  pageCount: number;
}

export const securityService = {
  /**
   * Encrypts a document so it can only be opened with `password`.
   *
   * Validates the source document with the normal `pdf.service` first —
   * corrupted, empty and already-encrypted files are rejected with the same
   * messages every other operation uses — and only then hands the bytes to
   * the encryption-capable library.
   */
  async protect(data: Uint8Array, password: string): Promise<ProtectResult> {
    let pageCount: number;
    try {
      ({ pageCount } = await pdfService.inspect(data));
    } catch (error) {
      if (error instanceof AppError && error.code === ErrorCode.ENCRYPTED_PDF) {
        // "Remove the password and try again" (the generic message) points at
        // a tool this app doesn't have yet, so this operation gets its own
        // wording for the same underlying situation.
        throw AppError.unprocessable(
          ErrorCode.ENCRYPTED_PDF,
          'This PDF already has a password. Upload the original, unprotected file to add a new one.',
        );
      }
      throw error;
    }

    const doc = await SecurePdfDocument.load(data, { updateMetadata: false });
    doc.setProducer('PDF Toolbox');
    doc.setCreator('PDF Toolbox');
    doc.setModificationDate(new Date());
    doc.encrypt({ userPassword: password, algorithm: 'AES-256' });

    try {
      const output = await doc.save({ useObjectStreams: true });
      return { output, pageCount };
    } catch (cause) {
      throw AppError.internal('Failed to write the protected PDF.', { cause });
    }
  },
};
