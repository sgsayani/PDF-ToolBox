import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { AppError } from '../errors/AppError.js';
import { loadDocument, serialise, validatePageNumbers } from './pdf.service.js';
import { renderService } from './render.service.js';

/** High enough that a flattened page still looks sharp; matches `cleanup.service.ts`'s choice. */
const REDACT_DPI = 200;

export interface RedactionArea {
  /** 1-based page number. */
  page: number;
  /** 0–1, fraction of page width/height, from the page's top-left corner. */
  xFraction: number;
  yFraction: number;
  widthFraction: number;
  heightFraction: number;
}

/**
 * Permanently redacts the given areas.
 *
 * Every redacted page is rasterized to an image with the covered regions
 * painted solid black *before* the page is rebuilt from that image — the
 * original vector text and image data for that page is discarded entirely,
 * not hidden behind or under an overlay. This was a deliberate choice over
 * drawing a black box on top of the existing page: this app's PDF engine
 * (mupdf) exposes a redaction API, but on inspection its "redacted" output
 * still left the original text fully present and extractable underneath the
 * black box — exactly the failure mode a redaction tool must not have.
 * Flattening to an image is the one approach that's actually verifiable:
 * there is no text or vector object left on that page to recover, at the
 * cost of that page's text no longer being selectable or searchable. Pages
 * with no redactions on them are left completely untouched.
 */
export const redactService = {
  async redact(data: Uint8Array, areas: RedactionArea[]): Promise<Uint8Array> {
    const source = await loadDocument(data);
    const pageCount = source.getPageCount();

    const targetPages = validatePageNumbers(
      areas.map((area) => area.page),
      pageCount,
    );
    const byPage = new Map<number, RedactionArea[]>();
    for (const area of areas) {
      const list = byPage.get(area.page) ?? [];
      list.push(area);
      byPage.set(area.page, list);
    }

    const rasterized = await renderService.rasterizePages(data, targetPages, REDACT_DPI);
    const rasterizedByPage = new Map(rasterized.map((page) => [page.pageNumber, page.jpeg]));

    const output = await PDFDocument.create();

    for (let index = 0; index < pageCount; index += 1) {
      const pageNumber = index + 1;
      const areasForPage = byPage.get(pageNumber);

      if (!areasForPage || areasForPage.length === 0) {
        const [copied] = await output.copyPages(source, [index]);
        output.addPage(copied);
        continue;
      }

      const { width, height } = source.getPage(index).getSize();
      const jpeg = rasterizedByPage.get(pageNumber);
      if (!jpeg) {
        throw AppError.internal(`Could not render page ${pageNumber} for redaction.`);
      }

      let flattened: Buffer;
      try {
        const meta = await sharp(Buffer.from(jpeg)).metadata();
        const pixelWidth = meta.width ?? Math.round((width / 72) * REDACT_DPI);
        const pixelHeight = meta.height ?? Math.round((height / 72) * REDACT_DPI);

        const boxes = areasForPage.map((area) => ({
          input: {
            create: {
              width: Math.max(1, Math.round(area.widthFraction * pixelWidth)),
              height: Math.max(1, Math.round(area.heightFraction * pixelHeight)),
              channels: 3 as const,
              background: { r: 0, g: 0, b: 0 },
            },
          },
          left: Math.round(area.xFraction * pixelWidth),
          top: Math.round(area.yFraction * pixelHeight),
        }));

        flattened = await sharp(Buffer.from(jpeg)).composite(boxes).jpeg({ quality: 90 }).toBuffer();
      } catch (cause) {
        throw AppError.internal(`Could not apply redactions on page ${pageNumber}.`, { cause });
      }

      const image = await output.embedJpg(flattened);
      const page = output.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }

    return serialise(output);
  },
};
