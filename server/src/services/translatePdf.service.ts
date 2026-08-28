import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { ocrService } from './ocr.service.js';
import { renderService } from './render.service.js';
import {
  translationService,
  type TranslateLanguage,
} from './translation.service.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = FONT_SIZE * 1.4;
const PARAGRAPH_GAP = LINE_HEIGHT * 0.6;

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

function drawLine(page: PDFPage, text: string, x: number, y: number, font: PDFFont): void {
  const color = rgb(0.12, 0.12, 0.12);
  try {
    page.drawText(text, { x, y, size: FONT_SIZE, font, color });
  } catch {
    page.drawText(text.replace(/[^\x20-\x7e]/g, '?'), { x, y, size: FONT_SIZE, font, color });
  }
}

export interface TranslateResult {
  output: Uint8Array;
  detectedSourceLang: string | null;
  pageCount: number;
}

export const translatePdfService = {
  /**
   * Extracts each page's text (OCR'ing any page with no text layer),
   * translates it, and lays the result out with one PDF page per source
   * page and a paragraph break wherever the source had a blank line — the
   * closest this can reasonably get to preserving page/paragraph structure
   * without also trying to reproduce the original's exact fonts and layout,
   * which the source text alone doesn't carry enough information to rebuild.
   */
  async translate(
    data: Uint8Array,
    targetLang: TranslateLanguage,
    sourceLang?: string,
  ): Promise<TranslateResult> {
    if (!translationService.isConfigured()) {
      throw AppError.serviceUnavailable(
        ErrorCode.TRANSLATION_UNAVAILABLE,
        'Translation is not configured on this server. Set DEEPL_API_KEY to enable it.',
      );
    }

    let extracted = await renderService.extractText(data);

    // Any page with nothing on it might be scanned rather than empty — OCR
    // it before giving up, reusing the same capability the OCR tool uses.
    if (!extracted.hasText) {
      const ocrResult = await ocrService
        .recognize(data, { pages: 'all', language: 'eng', generateSearchablePdf: false })
        .catch(() => null);

      if (ocrResult) {
        const byPage = new Map(ocrResult.pages.map((page) => [page.pageNumber, page.text]));
        extracted = {
          pages: extracted.pages.map((_, index) => byPage.get(index + 1) ?? ''),
          hasText: ocrResult.pages.some((page) => page.text.length > 0),
        };
      }
    }

    if (!extracted.hasText) {
      throw AppError.unprocessable(
        ErrorCode.EMPTY_RESULT,
        "We couldn't find any text to translate in this PDF, even after trying OCR.",
      );
    }

    const { translations, detectedSourceLang } = await translationService.translate(
      extracted.pages.map((page) => page || ' '),
      targetLang,
      sourceLang,
    );

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const maxWidth = PAGE_WIDTH - MARGIN * 2;

    translations.forEach((pageText) => {
      let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;

      const paragraphs = pageText
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      for (const paragraph of paragraphs.length > 0 ? paragraphs : ['(no text on this page)']) {
        for (const line of wrapLine(paragraph, font, FONT_SIZE, maxWidth)) {
          if (y < MARGIN + LINE_HEIGHT) {
            // A translation can run longer than its source page fit —
            // spill onto a continuation page rather than lose or overwrite
            // content. Each *source* page still starts its own fresh page.
            page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
          }
          drawLine(page, line, MARGIN, y, font);
          y -= LINE_HEIGHT;
        }
        y -= PARAGRAPH_GAP;
      }
    });

    doc.setProducer('PDF Toolbox');
    doc.setCreator('PDF Toolbox');
    doc.setModificationDate(new Date());

    let output: Uint8Array;
    try {
      output = await doc.save({ useObjectStreams: true });
    } catch (cause) {
      throw AppError.internal('Failed to write the translated PDF.', { cause });
    }

    return { output, detectedSourceLang, pageCount: doc.getPageCount() };
  },
};
