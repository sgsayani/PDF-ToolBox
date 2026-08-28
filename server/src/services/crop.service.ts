import { loadDocument, serialise, validatePageNumbers } from './pdf.service.js';

export interface CropRect {
  /** 0–1, fraction of page width/height, measured from the page's top-left corner. */
  xFraction: number;
  yFraction: number;
  widthFraction: number;
  heightFraction: number;
}

export interface CropOptions {
  pages: 'all' | number[];
  rect: CropRect;
}

export const cropService = {
  /** Sets the crop box on the target pages, computed from the given rect against each page's own size. */
  async crop(data: Uint8Array, { pages, rect }: CropOptions): Promise<Uint8Array> {
    const doc = await loadDocument(data);
    const pageCount = doc.getPageCount();
    const targets =
      pages === 'all'
        ? Array.from({ length: pageCount }, (_, index) => index + 1)
        : validatePageNumbers(pages, pageCount);

    for (const pageNumber of targets) {
      const page = doc.getPage(pageNumber - 1);
      const { width, height } = page.getSize();

      // The client's rect is top-left-origin (how people think about
      // cropping a preview image); pdf-lib's crop box is bottom-up, so `y`
      // flips.
      const cropWidth = rect.widthFraction * width;
      const cropHeight = rect.heightFraction * height;
      const x = rect.xFraction * width;
      const y = height - rect.yFraction * height - cropHeight;

      page.setCropBox(x, y, cropWidth, cropHeight);
    }

    return serialise(doc);
  },
};
