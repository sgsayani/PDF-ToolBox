import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { AppError } from '../errors/AppError.js';
import { loadDocument, serialise, validatePageNumbers } from './pdf.service.js';
import { renderService } from './render.service.js';

/** Good enough for a cleaned-up reading copy without ballooning file size. */
const CLEANUP_DPI = 200;

export interface CleanupOptions {
  pages: 'all' | number[];
  grayscale: boolean;
  /** -100..100 */
  brightness: number;
  /** -100..100 */
  contrast: number;
  /** -15..15 degrees. Manual straightening rather than automatic skew detection. */
  rotate: number;
  denoise: boolean;
  cleanBackground: boolean;
}

function resolveTargets(pages: 'all' | number[], pageCount: number): Set<number> {
  const list =
    pages === 'all' ? Array.from({ length: pageCount }, (_, index) => index + 1) : validatePageNumbers(pages, pageCount);
  return new Set(list);
}

/** Runs the requested adjustments over one page's rasterized image. */
async function applyAdjustments(jpeg: Uint8Array, options: CleanupOptions): Promise<Buffer> {
  let pipeline = sharp(Buffer.from(jpeg));

  if (options.rotate !== 0) {
    pipeline = pipeline.rotate(options.rotate, { background: '#ffffff' });
  }
  if (options.grayscale) {
    pipeline = pipeline.grayscale();
  }
  if (options.denoise) {
    // A small median filter smooths scanner speckle without softening text much.
    pipeline = pipeline.median(3);
  }
  if (options.brightness !== 0 || options.contrast !== 0) {
    // `linear(a, b)`: output = input * a + b, per channel. a>1 steepens
    // contrast; b shifts brightness up or down.
    const a = 1 + options.contrast / 100;
    const b = (options.brightness / 100) * 255;
    pipeline = pipeline.linear(a, b);
  }
  if (options.cleanBackground) {
    // Stretches the histogram so a dingy scanned background moves toward
    // white without a hard threshold that could blow out faint text.
    pipeline = pipeline.normalize();
  }

  return pipeline.jpeg({ quality: 88 }).toBuffer();
}

export const cleanupService = {
  /**
   * Rebuilds a PDF with the requested pages rasterized, adjusted and
   * re-embedded as images; pages outside the selection are copied through
   * untouched. Each page keeps its original physical size — the processed
   * image is scaled to fit inside it — so straightening or a resolution
   * change never crops or stretches the result.
   */
  async clean(data: Uint8Array, options: CleanupOptions): Promise<Uint8Array> {
    const source = await loadDocument(data);
    const pageCount = source.getPageCount();
    const targets = resolveTargets(options.pages, pageCount);

    const rasterized = await renderService.rasterizePages(data, [...targets], CLEANUP_DPI);
    const byPage = new Map(rasterized.map((page) => [page.pageNumber, page.jpeg]));

    const output = await PDFDocument.create();

    for (let index = 0; index < pageCount; index += 1) {
      const pageNumber = index + 1;

      if (!targets.has(pageNumber)) {
        const [copied] = await output.copyPages(source, [index]);
        output.addPage(copied);
        continue;
      }

      const { width, height } = source.getPage(index).getSize();
      const original = byPage.get(pageNumber);
      if (!original) {
        throw AppError.internal(`Could not render page ${pageNumber} for cleanup.`);
      }

      let processed: Buffer;
      try {
        processed = await applyAdjustments(original, options);
      } catch (cause) {
        throw AppError.internal(`Could not process page ${pageNumber}.`, { cause });
      }

      const image = await output.embedJpg(processed);
      const imageAspect = image.width / image.height;
      const pageAspect = width / height;
      const [drawWidth, drawHeight] =
        imageAspect > pageAspect ? [width, width / imageAspect] : [height * imageAspect, height];

      const page = output.addPage([width, height]);
      page.drawImage(image, {
        x: (width - drawWidth) / 2,
        y: (height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }

    return serialise(output);
  },
};
