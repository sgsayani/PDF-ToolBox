import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { AppError } from '../errors/AppError.js';
import { loadDocument, serialise } from './pdf.service.js';
import { renderService } from './render.service.js';

export const COMPRESSION_LEVELS = ['basic', 'balanced', 'strong'] as const;
export type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];

const LEVEL_SETTINGS: Record<CompressionLevel, { dpi: number; quality: number }> = {
  basic: { dpi: 200, quality: 90 },
  balanced: { dpi: 150, quality: 75 },
  strong: { dpi: 100, quality: 55 },
};

export interface CompressResult {
  output: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** True when the rasterized version was actually smaller and was used. */
  reduced: boolean;
}

/** Rebuilds every page as a re-encoded JPEG at the level's DPI/quality, fit to the page's original size. */
async function rasterizeToPdf(data: Uint8Array, dpi: number, quality: number): Promise<Uint8Array> {
  const source = await loadDocument(data);
  const pageCount = source.getPageCount();
  const rasterized = await renderService.rasterizePages(data, 'all', dpi);

  const output = await PDFDocument.create();

  for (let index = 0; index < pageCount; index += 1) {
    const { width, height } = source.getPage(index).getSize();
    const rasterizedPage = rasterized[index];
    if (!rasterizedPage) continue;

    const recompressed = await sharp(Buffer.from(rasterizedPage.jpeg)).jpeg({ quality }).toBuffer();
    const image = await output.embedJpg(recompressed);
    const page = output.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  return serialise(output);
}

export const compressService = {
  /**
   * Compression here means "re-encode every page as a smaller image" — the
   * one technique available without a dedicated PDF-optimizer library
   * (removing duplicate resources, subsetting fonts, recompressing embedded
   * images in place). That trade-off is real: it turns text into pixels, so
   * the result isn't searchable/selectable, and for an already-small,
   * mostly-text PDF the rasterized version can come out *larger*, not
   * smaller. When that happens, this returns the original (with its own
   * stream compression applied) instead of a bigger file, and says so.
   */
  async compress(data: Uint8Array, level: CompressionLevel): Promise<CompressResult> {
    const { dpi, quality } = LEVEL_SETTINGS[level];
    const originalSize = data.byteLength;

    let rasterizedOutput: Uint8Array;
    try {
      rasterizedOutput = await rasterizeToPdf(data, dpi, quality);
    } catch (cause) {
      throw AppError.internal('Failed to compress this PDF.', { cause });
    }

    if (rasterizedOutput.byteLength < originalSize) {
      return {
        output: rasterizedOutput,
        originalSize,
        compressedSize: rasterizedOutput.byteLength,
        reduced: true,
      };
    }

    // The rasterized version didn't help — fall back to a plain re-save,
    // which still recompresses streams and can shave a little off, but
    // never claim a reduction that didn't happen.
    const source = await loadDocument(data);
    const resaved = await serialise(source);
    return {
      output: resaved.byteLength < originalSize ? resaved : data,
      originalSize,
      compressedSize: Math.min(resaved.byteLength, originalSize),
      reduced: resaved.byteLength < originalSize,
    };
  },
};
