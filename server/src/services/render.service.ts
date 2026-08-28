import * as mupdf from 'mupdf';

import { AppError } from '../errors/AppError.js';
import { pdfService, validatePageNumbers } from './pdf.service.js';

/** Screen resolution is enough detail for a page export without huge files. */
const DEFAULT_DPI = 150;
const JPEG_QUALITY = 85;

export interface RasterizedPage {
  pageNumber: number;
  jpeg: Uint8Array;
}

export interface ExtractedText {
  /** One entry per page, in order. Empty string for a page with no text. */
  pages: string[];
  /** True when at least one page has non-whitespace text. */
  hasText: boolean;
}

/**
 * Opens a document with mupdf, the library used only for rendering and text
 * extraction — `pdf-lib` has no rasteriser and no text layer reader.
 *
 * The document is always validated with `pdfService.inspect` first (the same
 * check every other operation runs), so by the time mupdf sees the bytes they
 * are already confirmed to be a real, readable, unencrypted PDF. This keeps
 * error messages consistent across both libraries and means mupdf is never
 * asked to make sense of something already known to be invalid.
 */
async function openValidated(data: Uint8Array): Promise<{ doc: mupdf.PDFDocument; pageCount: number }> {
  const { pageCount } = await pdfService.inspect(data);
  const doc = mupdf.Document.openDocument(data, 'application/pdf') as mupdf.PDFDocument;
  return { doc, pageCount };
}

export const renderService = {
  /** Rasterizes the given pages (1-based, or `'all'`) to JPEG at a fixed screen resolution. */
  async rasterizePages(data: Uint8Array, pages: 'all' | number[]): Promise<RasterizedPage[]> {
    const { doc, pageCount } = await openValidated(data);
    const targets =
      pages === 'all'
        ? Array.from({ length: pageCount }, (_, index) => index + 1)
        : validatePageNumbers(pages, pageCount);
    const scale = DEFAULT_DPI / 72;
    const matrix = mupdf.Matrix.scale(scale, scale);

    try {
      return targets.map((pageNumber) => {
        const page = doc.loadPage(pageNumber - 1);
        try {
          const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
          try {
            return { pageNumber, jpeg: pixmap.asJPEG(JPEG_QUALITY, false) };
          } finally {
            pixmap.destroy();
          }
        } catch (cause) {
          throw AppError.internal(`Failed to render page ${pageNumber}.`, { cause });
        } finally {
          page.destroy();
        }
      });
    } finally {
      doc.destroy();
    }
  },

  /** Extracts the text layer, page by page, preserving reading order. */
  async extractText(data: Uint8Array): Promise<ExtractedText> {
    const { doc, pageCount } = await openValidated(data);

    try {
      const pages: string[] = [];
      for (let index = 0; index < pageCount; index += 1) {
        const page = doc.loadPage(index);
        try {
          const structured = page.toStructuredText('preserve-whitespace');
          pages.push(structured.asText().trim());
        } finally {
          page.destroy();
        }
      }
      return { pages, hasText: pages.some((page) => page.length > 0) };
    } finally {
      doc.destroy();
    }
  },
};
