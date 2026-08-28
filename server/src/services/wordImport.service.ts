import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';

/** A4 in points, matching the size every other generated PDF in this app uses. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = FONT_SIZE * 1.4;
/** Extra gap after a paragraph, on top of its last line's height. */
const PARAGRAPH_GAP = LINE_HEIGHT * 0.6;

/** Greedy word-wrap to a fixed width, measured against the real embedded font. */
function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(attempt, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draws text that may contain characters outside the standard font's
 * WinAnsi encoding (rare, but real — CJK text, some symbols). Falling back to
 * `?` for just that line keeps a single unusual character from failing the
 * whole conversion.
 */
function drawLine(page: PDFPage, text: string, x: number, y: number, font: PDFFont): void {
  const color = rgb(0.12, 0.12, 0.12);
  try {
    page.drawText(text, { x, y, size: FONT_SIZE, font, color });
  } catch {
    page.drawText(text.replace(/[^\x20-\x7e]/g, '?'), { x, y, size: FONT_SIZE, font, color });
  }
}

/**
 * Converts a `.docx` to a PDF, mirroring `wordExport.service.ts`'s reverse
 * conversion: text-preserving, not layout-preserving. `mammoth` reads the
 * document's paragraphs (dropping styling, tables and images), and pdf-lib
 * lays that text out on A4 pages with simple word-wrap and pagination.
 */
export const wordImportService = {
  async toPdf(data: Uint8Array): Promise<Uint8Array> {
    let rawText: string;
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(data) });
      rawText = result.value;
    } catch (cause) {
      throw AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        "We couldn't read this file. Make sure it's a valid .docx document.",
        { cause },
      );
    }

    const paragraphs = rawText
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);

    if (paragraphs.length === 0) {
      throw AppError.unprocessable(
        ErrorCode.EMPTY_RESULT,
        'This document has no readable text to convert.',
      );
    }

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const maxWidth = PAGE_WIDTH - MARGIN * 2;

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const startNewPage = () => {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    };

    for (const paragraph of paragraphs) {
      for (const line of wrapLine(paragraph, font, FONT_SIZE, maxWidth)) {
        if (y < MARGIN + LINE_HEIGHT) startNewPage();
        drawLine(page, line, MARGIN, y, font);
        y -= LINE_HEIGHT;
      }
      y -= PARAGRAPH_GAP;
    }

    doc.setProducer('PDF Toolbox');
    doc.setCreator('PDF Toolbox');
    doc.setModificationDate(new Date());

    try {
      return await doc.save({ useObjectStreams: true });
    } catch (cause) {
      throw AppError.internal('Failed to write the resulting PDF.', { cause });
    }
  },
};
