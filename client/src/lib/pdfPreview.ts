import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Target width of a thumbnail in CSS pixels. */
const THUMBNAIL_WIDTH = 220;
/** Devices report up to 3; rendering beyond 2 costs a lot for little gain. */
const MAX_PIXEL_RATIO = 2;
/** pdf.js renders on the main thread, so a small queue keeps the UI responsive. */
const MAX_CONCURRENT_RENDERS = 3;
/** Bounds memory on very long documents. */
const MAX_CACHED_THUMBNAILS = 400;

/**
 * Renders and caches page thumbnails for one document.
 *
 * Thumbnails are keyed by *source* page number and rendered at most once, so
 * reordering, selecting or rotating pages never triggers re-rasterisation —
 * those are pure layout and CSS transforms in the grid.
 */
export class PdfPreview {
  private readonly cache = new Map<number, string>();
  private readonly inFlight = new Map<number, Promise<string>>();
  private readonly queue: (() => void)[] = [];
  private running = 0;
  private destroyed = false;

  private constructor(private readonly document: PDFDocumentProxy) {}

  static async open(blob: Blob): Promise<PdfPreview> {
    // pdf.js takes ownership of (and detaches) the buffer it is handed, so it
    // gets its own copy — the blob stays reusable for downloads and re-opens.
    const data = new Uint8Array(await blob.arrayBuffer());

    const document = await pdfjsLib.getDocument({
      data,
      isEvalSupported: false,
      // Fonts and images are inlined by the server-produced files we handle;
      // avoiding remote fetches keeps preview rendering self-contained.
      disableFontFace: false,
    }).promise;

    return new PdfPreview(document);
  }

  get pageCount(): number {
    return this.document.numPages;
  }

  /** Returns a cached thumbnail synchronously, if one exists. */
  peek(pageNumber: number): string | undefined {
    return this.cache.get(pageNumber);
  }

  /** Renders a thumbnail, de-duplicating concurrent requests for the same page. */
  async getThumbnail(pageNumber: number): Promise<string> {
    const cached = this.cache.get(pageNumber);
    if (cached) return cached;

    const existing = this.inFlight.get(pageNumber);
    if (existing) return existing;

    const task = this.enqueue(() => this.render(pageNumber))
      .then((url) => {
        this.remember(pageNumber, url);
        return url;
      })
      .finally(() => {
        this.inFlight.delete(pageNumber);
      });

    this.inFlight.set(pageNumber, task);
    return task;
  }

  destroy(): void {
    this.destroyed = true;
    this.queue.length = 0;
    this.cache.clear();
    this.inFlight.clear();
    void this.document.destroy();
  }

  private remember(pageNumber: number, url: string): void {
    if (this.cache.size >= MAX_CACHED_THUMBNAILS) {
      // Map preserves insertion order, so the first key is the oldest entry.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(pageNumber, url);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.running += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.running -= 1;
            this.queue.shift()?.();
          });
      };

      if (this.running < MAX_CONCURRENT_RENDERS) run();
      else this.queue.push(run);
    });
  }

  private async render(pageNumber: number): Promise<string> {
    if (this.destroyed) throw new Error('Preview closed');

    const page = await this.document.getPage(pageNumber);
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    // `getViewport` already accounts for the page's own /Rotate value.
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (THUMBNAIL_WIDTH * pixelRatio) / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas is unavailable');

    // PDF pages have no background of their own; paint paper white first.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();

    return canvas.toDataURL('image/jpeg', 0.72);
  }
}
