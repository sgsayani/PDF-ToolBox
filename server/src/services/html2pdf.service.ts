import { PDFDocument } from 'pdf-lib';
import * as mupdf from 'mupdf';

import { AppError, ErrorCode } from '../errors/AppError.js';

/** A4 in points, matching every other generated PDF in this app. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const BASE_FONT_SIZE = 12;

/**
 * Renders HTML (with inline `<style>` CSS) to a PDF using mupdf's built-in
 * HTML/CSS layout engine — the same one it uses for EPUB. This is a real
 * layout engine, not a text dump: headings, bold/italic, tables and colours
 * come through; it is not a full browser, so advanced CSS (flexbox, grid,
 * webfonts) isn't guaranteed. `layout()` paginates the content to A4 pages
 * automatically, however long the source is.
 *
 * Deliberately the one shared primitive behind every "→ PDF" document
 * conversion in this app (Excel, CSV, plain text, PowerPoint) — each just
 * builds an HTML string and hands it here, rather than each reimplementing
 * page layout and pagination.
 */
export const html2pdfService = {
  async render(html: string): Promise<Uint8Array> {
    let source: mupdf.Document;
    try {
      source = mupdf.Document.openDocument(Buffer.from(html, 'utf-8'), 'text/html');
      source.layout(PAGE_WIDTH, PAGE_HEIGHT, BASE_FONT_SIZE);
    } catch (cause) {
      throw AppError.internal('Failed to lay out the document.', { cause });
    }

    const pageCount = source.countPages();
    if (pageCount === 0) {
      throw AppError.unprocessable(ErrorCode.EMPTY_RESULT, 'There was nothing to convert.');
    }

    const buffer = new mupdf.Buffer();
    const writer = new mupdf.DocumentWriter(buffer, 'pdf', '');

    try {
      for (let index = 0; index < pageCount; index += 1) {
        const page = source.loadPage(index);
        const device = writer.beginPage(page.getBounds());
        page.run(device, mupdf.Matrix.identity);
        writer.endPage();
      }
      writer.close();
    } catch (cause) {
      throw AppError.internal('Failed to render the document to PDF.', { cause });
    }

    // Re-open with pdf-lib purely to stamp the same Producer/Creator/date
    // every other generated PDF in this app carries.
    const stamped = await PDFDocument.load(buffer.asUint8Array());
    stamped.setProducer('PDF Toolbox');
    stamped.setCreator('PDF Toolbox');
    stamped.setModificationDate(new Date());
    return stamped.save({ useObjectStreams: true });
  },
};

/** Escapes text for safe inclusion in an HTML document `html2pdfService` will render. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The `<style>` block every generated document shares, for one consistent look. */
export const DOCUMENT_STYLE = `
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  h2 { font-size: 15px; margin: 24px 0 10px; }
  p { font-size: 12px; line-height: 1.6; margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 16px; }
  th, td { border: 1px solid #d0d0d0; padding: 5px 8px; font-size: 11px; text-align: left; }
  th { background: #f2f2f2; font-weight: 600; }
  .page-break { page-break-before: always; }
`;
