import { PDFDocument } from 'pdf-lib';
import { createWorker } from 'tesseract.js';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { renderService } from './render.service.js';

/**
 * Languages with a Tesseract trained-data pack Tesseract.js can fetch.
 * Deliberately a curated subset rather than the full ~100 Tesseract supports:
 * every one of these is verified to work, and an unlisted language is
 * rejected up front with a clear message rather than failing deep inside a
 * worker.
 */
export const OCR_LANGUAGES = ['eng', 'fra', 'deu', 'spa', 'ita', 'por'] as const;
export type OcrLanguage = (typeof OCR_LANGUAGES)[number];

export const OCR_LANGUAGE_LABELS: Record<OcrLanguage, string> = {
  eng: 'English',
  fra: 'French',
  deu: 'German',
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
};

/**
 * Higher than the 150 DPI `to-jpg` renders at — recognition accuracy depends
 * directly on source resolution, and this is a one-off operation rather than
 * something rendered on every page view.
 */
const OCR_DPI = 300;

/** Tesseract's own 0–100 confidence scale. Below this, the scan is flagged rather than trusted outright. */
const LOW_CONFIDENCE_THRESHOLD = 45;

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface OcrResult {
  pages: OcrPageResult[];
  meanConfidence: number;
  /** True when the mean confidence is low enough that results may be unreliable. */
  lowQuality: boolean;
  /** A multi-page PDF combining each page's original image with an invisible OCR text layer, when requested. */
  searchablePdf: Uint8Array | null;
}

export interface OcrOptions {
  pages: 'all' | number[];
  language: OcrLanguage;
  generateSearchablePdf: boolean;
}

/** Concatenates Tesseract's own per-page PDF output into one multi-page document. */
async function mergeSearchablePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const output = await PDFDocument.create();

  for (const part of parts) {
    const source = await PDFDocument.load(part);
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
  }

  output.setProducer('PDF Toolbox');
  output.setCreator('PDF Toolbox');
  output.setModificationDate(new Date());

  return output.save({ useObjectStreams: true });
}

export const ocrService = {
  /** Runs OCR over the given pages, sequentially, on one worker for the whole request. */
  async recognize(data: Uint8Array, options: OcrOptions): Promise<OcrResult> {
    const rasterized = await renderService.rasterizePages(data, options.pages, OCR_DPI);

    let worker;
    try {
      worker = await createWorker(options.language);
    } catch (cause) {
      throw AppError.unprocessable(
        ErrorCode.PROCESSING_FAILED,
        'OCR is not available for the selected language right now. Please try English or another supported language.',
        { cause },
      );
    }

    const pages: OcrPageResult[] = [];
    const pdfParts: Uint8Array[] = [];

    try {
      for (const page of rasterized) {
        let recognized;
        try {
          recognized = await worker.recognize(
            Buffer.from(page.jpeg),
            {},
            { text: true, pdf: options.generateSearchablePdf },
          );
        } catch (cause) {
          throw AppError.internal(`OCR failed on page ${page.pageNumber}.`, { cause });
        }

        pages.push({
          pageNumber: page.pageNumber,
          text: recognized.data.text.trim(),
          confidence: recognized.data.confidence,
        });

        if (options.generateSearchablePdf && recognized.data.pdf) {
          // Tesseract.js's type declares this as a plain `number[]`, though it
          // is byte data at runtime — matches what `mergeSearchablePdfs` and
          // pdf-lib expect.
          pdfParts.push(Uint8Array.from(recognized.data.pdf));
        }
      }
    } finally {
      await worker.terminate();
    }

    const hasText = pages.some((page) => page.text.length > 0);
    if (!hasText) {
      throw AppError.unprocessable(
        ErrorCode.PROCESSING_FAILED,
        "We couldn't find any readable text in this scan. It may be blank, too low-resolution, or in a language we don't support.",
      );
    }

    const meanConfidence = Math.round(
      pages.reduce((sum, page) => sum + page.confidence, 0) / pages.length,
    );

    let searchablePdf: Uint8Array | null = null;
    if (options.generateSearchablePdf && pdfParts.length > 0) {
      try {
        searchablePdf = await mergeSearchablePdfs(pdfParts);
      } catch (cause) {
        throw AppError.internal('Failed to assemble the searchable PDF.', { cause });
      }
    }

    return {
      pages,
      meanConfidence,
      lowQuality: meanConfidence < LOW_CONFIDENCE_THRESHOLD,
      searchablePdf,
    };
  },
};
