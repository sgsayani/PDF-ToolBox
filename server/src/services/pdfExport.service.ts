// pptxgenjs ships a UMD-style declaration that TypeScript's NodeNext
// resolution doesn't map to a constructable default export, even though the
// package genuinely exports the `PptxGenJS` class as its CJS default. This
// import + cast is the documented workaround, not a type-safety hole: the
// shape asserted here matches the package's own `.d.ts`.
import * as PptxGenJSModule from 'pptxgenjs';
import * as XLSX from 'xlsx';

// Under Node ESM interop the real class is `.default`; the bare namespace
// import is not itself constructable at runtime, only in (mis-resolved) types.
const PptxGenJS = (PptxGenJSModule as { default?: unknown }).default as new () => PptxGenJSModule.default;

import { AppError, ErrorCode } from '../errors/AppError.js';
import { escapeHtml } from './html2pdf.service.js';
import { pdfService } from './pdf.service.js';
import { renderService } from './render.service.js';

/**
 * Splits a line of extracted text into candidate table cells wherever two or
 * more spaces run together — the common signature of a space-aligned table
 * in a text layer. This is a heuristic, not a real table detector: it works
 * well for PDFs whose columns were laid out with padding (the usual case for
 * an exported report or spreadsheet-to-PDF), and it will under- or
 * over-split a tightly-kerned or grid-drawn table. There is no dependency in
 * this project that does real table detection, so this is the honest
 * "attempt to preserve rows and columns" the brief asks for, not a claim of
 * perfect extraction.
 */
function splitRow(line: string): string[] {
  return line
    .trim()
    .split(/\s{2,}/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

interface ExtractedTable {
  /** One entry per page; each page is an array of rows, each row an array of cells. */
  pages: string[][][];
  hasRows: boolean;
}

async function extractTable(data: Uint8Array): Promise<ExtractedTable> {
  const { pages: pageTexts } = await renderService.extractText(data);

  const pages = pageTexts.map((pageText) =>
    pageText
      .split(/\r?\n/)
      .map(splitRow)
      .filter((row) => row.length > 0),
  );

  return { pages, hasRows: pages.some((page) => page.length > 0) };
}

function requireRows(table: ExtractedTable): void {
  if (!table.hasRows) {
    throw AppError.unprocessable(
      ErrorCode.EMPTY_RESULT,
      'No text was found to extract into a table. Scanned pages need OCR first.',
    );
  }
}

/** Escapes one CSV field per RFC 4180. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export const pdfExportService = {
  /** Every page's rows, flattened into one CSV — CSV has no concept of sheets. */
  async toCsv(data: Uint8Array): Promise<string> {
    const table = await extractTable(data);
    requireRows(table);

    const lines: string[] = [];
    table.pages.forEach((rows, index) => {
      if (index > 0 && rows.length > 0) lines.push('');
      for (const row of rows) lines.push(row.map(csvField).join(','));
    });
    return lines.join('\r\n');
  },

  /** One worksheet per PDF page, so a multi-page document stays navigable rather than one giant flattened sheet. */
  async toExcel(data: Uint8Array): Promise<Uint8Array> {
    const table = await extractTable(data);
    requireRows(table);

    const workbook = XLSX.utils.book_new();
    table.pages.forEach((rows, index) => {
      const sheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['(no text on this page)']]);
      XLSX.utils.book_append_sheet(workbook, sheet, `Page ${index + 1}`);
    });

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
  },

  /** Clean, semantic HTML — not the PDF re-exposed in an iframe. */
  async toHtml(data: Uint8Array, title: string): Promise<string> {
    const { pages, hasText } = await renderService.extractText(data);
    if (!hasText) {
      throw AppError.unprocessable(
        ErrorCode.EMPTY_RESULT,
        'This PDF has no extractable text. Scanned pages need OCR first.',
      );
    }

    const sections = pages
      .map((pageText, index) => {
        const paragraphs = pageText
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('\n');
        return `<section aria-label="Page ${index + 1}">\n<h2>Page ${index + 1}</h2>\n${paragraphs || '<p><em>(no text on this page)</em></p>'}\n</section>`;
      })
      .join('\n<hr>\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
  h1 { font-size: 22px; } h2 { font-size: 14px; color: #555; margin-top: 32px; }
  p { line-height: 1.6; } hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${sections}
</body>
</html>`;
  },

  /**
   * One slide per page, each a full-page image of that page. PowerPoint text
   * boxes are not reconstructed — there's no reliable way to turn a PDF's
   * text layer back into editable slide placeholders without guessing at a
   * layout that never existed in the source. This is the same trade-off
   * OCR's "searchable PDF" makes in reverse: an accurate visual copy over an
   * inaccurate editable one.
   */
  async toPptx(data: Uint8Array): Promise<Uint8Array> {
    const metadata = await pdfService.inspect(data);
    const rasterized = await renderService.rasterizePages(data, 'all');

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'PDF_PAGE', width: 10, height: 7.5 });
    pptx.layout = 'PDF_PAGE';

    rasterized.forEach((page, index) => {
      const sourcePage = metadata.pages[index];
      const aspect = sourcePage ? sourcePage.width / sourcePage.height : 10 / 7.5;
      const slide = pptx.addSlide();

      // Fit the page image inside the 10x7.5in slide without distortion,
      // and pass explicit dimensions so no image-dimension probing happens.
      let width = 10;
      let height = 10 / aspect;
      if (height > 7.5) {
        height = 7.5;
        width = 7.5 * aspect;
      }
      const x = (10 - width) / 2;
      const y = (7.5 - height) / 2;

      slide.addImage({
        data: `data:image/jpeg;base64,${Buffer.from(page.jpeg).toString('base64')}`,
        x,
        y,
        w: width,
        h: height,
      });
    });

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return buffer as Uint8Array;
  },
};
