import { PDFDocument as SecurePdfDocument } from '@cantoo/pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { looksLikePdf, pdfService } from './pdf.service.js';

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

/** `@cantoo/pdf-lib`'s own message when the supplied password doesn't match. */
const WRONG_PASSWORD_MESSAGE = 'Password incorrect';

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

  /**
   * Decrypts a document with a user-supplied password and produces a normal,
   * unprotected PDF. This only ever *removes* a password the caller already
   * knows — there is no attempt to guess, crack or otherwise bypass one.
   *
   * `pdf-lib` can't read encrypted content at all, so — like `protect` —
   * this goes through `@cantoo/pdf-lib` instead. Unlike `protect`, the input
   * is *expected* to be encrypted, so the normal `pdf.service` validation
   * (which rejects encrypted files) is deliberately not used here; a cheap
   * PDF-header check stands in for it instead.
   */
  async removePassword(data: Uint8Array, password: string): Promise<ProtectResult> {
    if (!looksLikePdf(data)) {
      throw AppError.badRequest(
        ErrorCode.INVALID_PDF,
        "This file doesn't look like a PDF. Please upload a valid .pdf file.",
      );
    }

    let doc;
    try {
      doc = await SecurePdfDocument.load(data, { password, updateMetadata: false });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);

      if (message === WRONG_PASSWORD_MESSAGE) {
        throw AppError.unprocessable(
          ErrorCode.INCORRECT_PASSWORD,
          'That password is incorrect. Please check it and try again.',
          { cause },
        );
      }

      throw AppError.unprocessable(
        ErrorCode.INVALID_PDF,
        "We couldn't read this PDF. It may be corrupted or use an unsupported encryption method.",
        { cause },
      );
    }

    doc.setProducer('PDF Toolbox');
    doc.setCreator('PDF Toolbox');
    doc.setModificationDate(new Date());

    try {
      const output = await doc.save({ useObjectStreams: true });
      return { output, pageCount: doc.getPageCount() };
    } catch (cause) {
      throw AppError.internal('Failed to write the unlocked PDF.', { cause });
    }
  },
};
