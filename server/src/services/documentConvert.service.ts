import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { DOCUMENT_STYLE, escapeHtml, html2pdfService } from './html2pdf.service.js';

const MAX_ROWS_PER_SHEET = 5000;

/** A cell as `xlsx` hands it back: a primitive, a parsed Date (with `cellDates`), or empty. */
function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toLocaleDateString();
  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell);
  }
  // Any other shape (a formula error object, etc.) — safer than a raw
  // `String()`, which would print "[object Object]".
  return '';
}

/** Renders one worksheet's used range as an HTML table. */
function sheetToTable(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) return '<p><em>(empty sheet)</em></p>';

  const truncated = rows.length > MAX_ROWS_PER_SHEET;
  const shown = rows.slice(0, MAX_ROWS_PER_SHEET);

  const [header, ...body] = shown;
  const headRow = (header ?? []).map((cell) => `<th>${escapeHtml(cellToText(cell))}</th>`).join('');
  const bodyRows = body
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cellToText(cell))}</td>`).join('')}</tr>`)
    .join('');

  return `
    <table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>
    ${truncated ? `<p><em>Showing the first ${MAX_ROWS_PER_SHEET.toLocaleString()} rows of ${rows.length.toLocaleString()}.</em></p>` : ''}
  `;
}

function readWorkbook(data: Uint8Array, invalidMessage: string): XLSX.WorkBook {
  try {
    const workbook = XLSX.read(data, { type: 'buffer', cellDates: true });
    if (workbook.SheetNames.length === 0) throw new Error('No sheets');
    return workbook;
  } catch (cause) {
    throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, invalidMessage, { cause });
  }
}

export const documentConvertService = {
  /** Renders every sheet as its own table, one heading per sheet — multi-sheet workbooks stay readable. */
  async excelToPdf(data: Uint8Array): Promise<Uint8Array> {
    const workbook = readWorkbook(
      data,
      "We couldn't read this file. Make sure it's a valid Excel workbook (.xlsx or .xls).",
    );

    const sections = workbook.SheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name];
      const table = sheet ? sheetToTable(sheet) : '<p><em>(empty sheet)</em></p>';
      return `<div${index > 0 ? ' class="page-break"' : ''}><h1>${escapeHtml(name)}</h1>${table}</div>`;
    });

    const html = `<!DOCTYPE html><html><head><style>${DOCUMENT_STYLE}</style></head><body>${sections.join('')}</body></html>`;
    return html2pdfService.render(html);
  },

  /** CSV is a single-sheet workbook as far as the parser is concerned — same path as Excel, minus the sheet heading. */
  async csvToPdf(data: Uint8Array): Promise<Uint8Array> {
    const workbook = readWorkbook(data, "We couldn't read this file as CSV.");
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    const table = sheet ? sheetToTable(sheet) : '<p><em>(empty file)</em></p>';
    const html = `<!DOCTYPE html><html><head><style>${DOCUMENT_STYLE}</style></head><body>${table}</body></html>`;
    return html2pdfService.render(html);
  },

  /** Plain text, one paragraph per non-empty line, blank lines preserved as spacing. */
  async textToPdf(data: Uint8Array, filename: string): Promise<Uint8Array> {
    const text = Buffer.from(data).toString('utf-8');
    if (text.trim().length === 0) {
      throw AppError.unprocessable(ErrorCode.EMPTY_RESULT, 'This file has no text to convert.');
    }

    const paragraphs = text
      .split(/\r?\n/)
      .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><style>${DOCUMENT_STYLE}</style></head><body><h1>${escapeHtml(filename)}</h1>${paragraphs}</body></html>`;
    return html2pdfService.render(html);
  },

  /** Uploaded HTML, rendered as-is — its own `<style>` (inline CSS) is respected by the layout engine. */
  async htmlToPdf(data: Uint8Array): Promise<Uint8Array> {
    const html = Buffer.from(data).toString('utf-8');
    if (html.trim().length === 0) {
      throw AppError.unprocessable(ErrorCode.EMPTY_RESULT, 'This file has no content to convert.');
    }
    return html2pdfService.render(html);
  },

  /**
   * Text-only reconstruction of a `.pptx`: each slide's text runs, extracted
   * directly from its XML, become one page. Slide layout, images and
   * transitions are not reproduced — there is no reliable way to do that
   * without a real presentation renderer (e.g. LibreOffice), which this
   * environment doesn't have installed.
   */
  async pptxToPdf(data: Uint8Array): Promise<Uint8Array> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(data);
    } catch (cause) {
      throw AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        "We couldn't read this file. Make sure it's a valid PowerPoint (.pptx) file.",
        { cause },
      );
    }

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numOf = (name: string) => Number(/slide(\d+)\.xml$/.exec(name)?.[1] ?? 0);
        return numOf(a) - numOf(b);
      });

    if (slideFiles.length === 0) {
      throw AppError.unprocessable(
        ErrorCode.EMPTY_RESULT,
        "This file doesn't look like a PowerPoint presentation — no slides were found.",
      );
    }

    const sections = await Promise.all(
      slideFiles.map(async (name, index) => {
        const xml = await zip.files[name]!.async('text');
        const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => match[1] ?? '');
        const paragraphs = runs.filter((run) => run.trim().length > 0);
        const body =
          paragraphs.length > 0
            ? paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
            : '<p><em>(no text on this slide)</em></p>';
        return `<div${index > 0 ? ' class="page-break"' : ''}><h2>Slide ${index + 1}</h2>${body}</div>`;
      }),
    );

    const html = `<!DOCTYPE html><html><head><style>${DOCUMENT_STYLE}</style></head><body>${sections.join('')}</body></html>`;
    return html2pdfService.render(html);
  },
};
