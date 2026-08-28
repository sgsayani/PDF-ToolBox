import { Document, Packer, Paragraph, PageBreak, TextRun } from 'docx';

import { AppError, ErrorCode } from '../errors/AppError.js';

/**
 * Turns extracted page text into a DOCX.
 *
 * This is deliberately a text-preserving conversion, not a layout-preserving
 * one: pdf-lib and mupdf give us a text stream, not the original document's
 * fonts, columns or images, so reproducing the source's exact formatting
 * isn't attempted. Each line becomes a paragraph and each source page becomes
 * a Word page break, which keeps the result readable and honest about what
 * it is rather than a convincing-looking approximation.
 */
export const wordExportService = {
  async fromPages(pages: string[]): Promise<Uint8Array> {
    const hasText = pages.some((page) => page.trim().length > 0);
    if (!hasText) {
      throw AppError.unprocessable(
        ErrorCode.EMPTY_RESULT,
        'This PDF has no extractable text to convert. It may be a scanned document without a text layer.',
      );
    }

    const children: Paragraph[] = [];

    pages.forEach((pageText, pageIndex) => {
      const lines = pageText.length > 0 ? pageText.split('\n') : [''];
      for (const line of lines) {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      }
      if (pageIndex < pages.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });

    const doc = new Document({
      creator: 'PDF Toolbox',
      title: 'Converted document',
      sections: [{ children }],
    });

    return Packer.toBuffer(doc);
  },
};
