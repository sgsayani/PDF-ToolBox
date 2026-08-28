import { degrees, PDFDict, PDFName, StandardFonts, rgb, PDFDocument } from 'pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

/** Geometry of a single page, as stored in the document. */
export interface PageInfo {
  /** 1-based page number. */
  number: number;
  width: number;
  height: number;
  /** Normalised to one of 0, 90, 180, 270. */
  rotation: number;
}

export interface PdfMetadata {
  pageCount: number;
  pages: PageInfo[];
}

/**
 * One entry in a page plan: which source page to keep, and how far to turn it
 * relative to its existing rotation.
 */
export interface PagePlanEntry {
  /** 1-based page number in the source document. */
  source: number;
  /** Quarter-turn delta in degrees; normalised to 0/90/180/270. */
  rotate: number;
}

const PDF_HEADER = '%PDF-';
/** Some valid PDFs carry preamble bytes before the header, so scan a window. */
const HEADER_SCAN_BYTES = 1024;

/**
 * Cheap structural check performed before handing bytes to the PDF parser.
 * Rejects obvious non-PDFs (including renamed executables) early.
 */
export function looksLikePdf(data: Uint8Array): boolean {
  if (data.byteLength < PDF_HEADER.length) return false;
  const window = Buffer.from(data.buffer, data.byteOffset, Math.min(data.byteLength, HEADER_SCAN_BYTES));
  return window.includes(PDF_HEADER, 0, 'latin1');
}

/**
 * Determines whether a document that failed to load did so *because* it is
 * encrypted.
 *
 * pdf-lib does signal encryption with its own error class, but that class
 * loses its prototype chain when transpiled, so `instanceof` and `name` checks
 * both fail. Rather than matching on an error message that could change with
 * any release, this re-reads the file with encryption ignored: if the
 * structure parses that way, encryption was the only thing in the way.
 */
async function isEncrypted(data: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
    return true;
  } catch {
    return false;
  }
}

/** Loads a document, translating parser failures into client-safe errors. */
export async function loadDocument(data: Uint8Array): Promise<PDFDocument> {
  if (!looksLikePdf(data)) {
    throw AppError.badRequest(
      ErrorCode.INVALID_PDF,
      "This file doesn't look like a PDF. Please upload a valid .pdf file.",
    );
  }

  try {
    return await PDFDocument.load(data, { ignoreEncryption: false, updateMetadata: false });
  } catch (cause) {
    if (await isEncrypted(data)) {
      throw AppError.unprocessable(
        ErrorCode.ENCRYPTED_PDF,
        'This PDF is password-protected. Remove the password and try again.',
        { cause },
      );
    }

    logger.warn('PDF parse failed', {
      error: cause instanceof Error ? cause.message : String(cause),
    });
    throw AppError.unprocessable(
      ErrorCode.INVALID_PDF,
      "We couldn't read this PDF. The file may be corrupted or incomplete.",
      { cause },
    );
  }
}

function normaliseAngle(angle: number): number {
  const wrapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return wrapped;
}

function describe(doc: PDFDocument): PdfMetadata {
  const pages = doc.getPages().map((page, index) => {
    const { width, height } = page.getSize();
    return {
      number: index + 1,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      rotation: normaliseAngle(page.getRotation().angle),
    };
  });

  return { pageCount: pages.length, pages };
}

/** Stamps our own producer so output files are self-describing. */
function applyProducerMetadata(doc: PDFDocument): void {
  doc.setProducer('PDF Toolbox');
  doc.setCreator('PDF Toolbox');
  doc.setModificationDate(new Date());
}

export async function serialise(doc: PDFDocument): Promise<Uint8Array> {
  applyProducerMetadata(doc);
  try {
    return await doc.save({ useObjectStreams: true });
  } catch (cause) {
    throw AppError.internal('Failed to write the resulting PDF.', { cause });
  }
}

/**
 * Validates 1-based page numbers against a document, preserving the caller's
 * ordering. De-duplicates unless the caller explicitly allows repeats (a page
 * plan may legitimately include the same source page more than once).
 */
export function validatePageNumbers(
  pageNumbers: number[],
  pageCount: number,
  options: { allowDuplicates?: boolean } = {},
): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const pageNumber of pageNumbers) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw AppError.badRequest(
        ErrorCode.PAGE_OUT_OF_RANGE,
        `Page ${pageNumber} doesn't exist in this document (it has ${pageCount} ${
          pageCount === 1 ? 'page' : 'pages'
        }).`,
        { details: { pageNumber, pageCount } },
      );
    }
    if (options.allowDuplicates || !seen.has(pageNumber)) {
      seen.add(pageNumber);
      result.push(pageNumber);
    }
  }

  return result;
}

/**
 * Builds a new document from an explicit page plan.
 *
 * Delete, extract, reorder and rotate are all expressible as "keep these
 * source pages, in this sequence, turned by this much" — so they share one
 * implementation and therefore one set of guarantees.
 */
async function buildFromPlan(data: Uint8Array, plan: PagePlanEntry[]): Promise<Uint8Array> {
  const source = await loadDocument(data);
  const pageCount = source.getPageCount();
  const validated = validatePageNumbers(
    plan.map((entry) => entry.source),
    pageCount,
    { allowDuplicates: true },
  );

  if (validated.length === 0) {
    throw AppError.badRequest(
      ErrorCode.EMPTY_RESULT,
      'The result would contain no pages. Keep at least one page.',
    );
  }

  const output = await PDFDocument.create();
  const copied = await output.copyPages(
    source,
    validated.map((pageNumber) => pageNumber - 1),
  );

  copied.forEach((page, index) => {
    const delta = plan[index]?.rotate ?? 0;
    if (delta !== 0) {
      page.setRotation(degrees(normaliseAngle(page.getRotation().angle + delta)));
    }
    output.addPage(page);
  });

  return serialise(output);
}

/**
 * A 3x3 anchor grid used to place a stamp (watermark text, a page number, or a
 * signature image) on a page. `center` is shorthand for the middle cell of the
 * middle row and, unlike the other eight, is drawn at 45° when used for a
 * watermark — the classic diagonal look.
 */
export const POSITION_PRESETS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type PositionPreset = (typeof POSITION_PRESETS)[number];

type Vertical = 'top' | 'middle' | 'bottom';
type Horizontal = 'left' | 'center' | 'right';

interface AnchorParams {
  width: number;
  height: number;
  /** Width of the thing being placed (text or image), before any rotation. */
  boxWidth: number;
  /** Height of the thing being placed, before any rotation. */
  boxHeight: number;
  /** Distance kept from the page edges for the eight non-centred positions. */
  margin: number;
  /** Degrees, applied only when `position` is `'center'`. */
  rotateDeg?: number;
}

/**
 * Resolves a position preset to the bottom-left anchor point pdf-lib's
 * `drawText`/`drawImage` expect, for a box of the given size on a page of the
 * given size.
 *
 * Shared by the watermark, page-number and signature features — they only
 * differ in what they draw and at what size, not in where "top-right" or
 * "center" means on a page.
 */
function anchorFor(position: PositionPreset, params: AnchorParams): [number, number] {
  const { width, height, boxWidth, boxHeight, margin, rotateDeg = 0 } = params;

  if (position === 'center' && rotateDeg !== 0) {
    // A rotated box's own centre no longer sits at its anchor point, so the
    // anchor is offset by the centre point rotated back by the same angle —
    // this keeps the rotated box visually centred on the page.
    const angle = (rotateDeg * Math.PI) / 180;
    const dx = (boxWidth / 2) * Math.cos(angle) - (boxHeight / 2) * Math.sin(angle);
    const dy = (boxWidth / 2) * Math.sin(angle) + (boxHeight / 2) * Math.cos(angle);
    return [width / 2 - dx, height / 2 - dy];
  }

  const [vertical, horizontal]: [Vertical, Horizontal] =
    position === 'center' ? ['middle', 'center'] : (position.split('-') as [Vertical, Horizontal]);

  const xFor: Record<Horizontal, number> = {
    left: margin,
    center: (width - boxWidth) / 2,
    right: width - margin - boxWidth,
  };
  const yFor: Record<Vertical, number> = {
    top: height - margin - boxHeight,
    middle: (height - boxHeight) / 2,
    bottom: margin,
  };

  return [xFor[horizontal], yFor[vertical]];
}

const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47];

/** Cheap structural check for a JPEG, mirroring `looksLikePdf`. */
export function looksLikeJpeg(data: Uint8Array): boolean {
  return JPEG_HEADER.every((byte, index) => data[index] === byte);
}

/** Cheap structural check for a PNG, mirroring `looksLikePdf`. */
export function looksLikePng(data: Uint8Array): boolean {
  return PNG_HEADER.every((byte, index) => data[index] === byte);
}

/** Generous for a hand-drawn signature; guards against an oversized upload. */
const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Decodes a signature capture sent as a `data:image/png;base64,...` URL.
 * Validated defensively: this is the one place the app accepts arbitrary
 * client-supplied binary content rather than a PDF.
 */
function decodeSignatureImage(dataUrl: string): Uint8Array {
  const match = /^data:image\/png;base64,([a-z0-9+/]+=*)$/i.exec(dataUrl.trim());
  if (!match?.[1]) {
    throw AppError.badRequest(
      ErrorCode.VALIDATION_FAILED,
      "Your signature couldn't be read. Please draw it again.",
    );
  }

  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIGNATURE_IMAGE_BYTES) {
    throw AppError.badRequest(
      ErrorCode.VALIDATION_FAILED,
      "Your signature couldn't be read. Please draw it again.",
    );
  }
  if (!looksLikePng(bytes)) {
    throw AppError.badRequest(
      ErrorCode.VALIDATION_FAILED,
      "Your signature couldn't be read. Please draw it again.",
    );
  }

  return bytes;
}

/** Resolves an `'all' | number[]` page selector against a document. */
function resolveTargetPages(pages: 'all' | number[], pageCount: number): number[] {
  if (pages === 'all') return Array.from({ length: pageCount }, (_, index) => index + 1);
  return validatePageNumbers(pages, pageCount);
}

export interface WatermarkOptions {
  text: string;
  position: PositionPreset;
  /** 0–1. */
  opacity: number;
  fontSize: number;
  pages: 'all' | number[];
}

export interface PageNumberOptions {
  position: PositionPreset;
  startNumber: number;
  pages: 'all' | number[];
}

export interface SignOptions {
  /** 1-based source page the signature is placed on. */
  page: number;
  position: PositionPreset;
  /** Signature width as a percentage of the page width. */
  widthPercent: number;
  /** `data:image/png;base64,...` capture from the signature pad. */
  image: string;
}

export interface SourceImage {
  data: Uint8Array;
  /** Original filename, used only for error messages. */
  filename: string;
}

/** Basic, non-certified metadata read from a document's Info dictionary. */
export interface PdfMetadataView {
  title: string | null;
  author: string | null;
  subject: string | null;
  keywords: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modificationDate: string | null;
  pageCount: number;
  /** True when any field above (besides page count) is actually set. */
  hasMetadata: boolean;
}

export const pdfService = {
  looksLikePdf,

  /** Parses a document and returns its page structure. Also acts as validation. */
  async inspect(data: Uint8Array): Promise<PdfMetadata> {
    const doc = await loadDocument(data);

    // `PDFDocument.load` can succeed on a file that has a valid header and
    // trailer but a broken or missing page tree — it only fails once
    // something actually walks the tree, which `describe` (via `getPages`)
    // is the first thing to do. Caught here so that failure reads as the
    // same "invalid PDF" every other malformed file produces, not a raw
    // internal error.
    let metadata: PdfMetadata;
    try {
      metadata = describe(doc);
    } catch (cause) {
      logger.warn('PDF page tree could not be read', {
        error: cause instanceof Error ? cause.message : String(cause),
      });
      throw AppError.unprocessable(
        ErrorCode.INVALID_PDF,
        "We couldn't read this PDF. The file may be corrupted or incomplete.",
        { cause },
      );
    }

    if (metadata.pageCount === 0) {
      throw AppError.unprocessable(
        ErrorCode.INVALID_PDF,
        'This PDF has no pages, so there is nothing to work with.',
      );
    }

    return metadata;
  },

  /** Reads the document's Info dictionary. Never mutates the file. */
  async readMetadata(data: Uint8Array): Promise<PdfMetadataView> {
    const doc = await loadDocument(data);

    const view: PdfMetadataView = {
      title: doc.getTitle() ?? null,
      author: doc.getAuthor() ?? null,
      subject: doc.getSubject() ?? null,
      keywords: doc.getKeywords() ?? null,
      creator: doc.getCreator() ?? null,
      producer: doc.getProducer() ?? null,
      creationDate: doc.getCreationDate()?.toISOString() ?? null,
      modificationDate: doc.getModificationDate()?.toISOString() ?? null,
      pageCount: doc.getPageCount(),
      hasMetadata: false,
    };

    view.hasMetadata = [
      view.title,
      view.author,
      view.subject,
      view.keywords,
      view.creator,
      view.producer,
      view.creationDate,
    ].some((value) => value !== null);

    return view;
  },

  /**
   * Applies a complete page plan in one pass: pages absent from the plan are
   * dropped, the plan's order becomes the new order, and each entry's rotation
   * delta is applied. This is what the workspace uses, so a session of edits
   * commits as a single, atomic operation.
   */
  async organize(data: Uint8Array, plan: PagePlanEntry[]): Promise<Uint8Array> {
    if (plan.length === 0) {
      throw AppError.badRequest(
        ErrorCode.EMPTY_RESULT,
        'A PDF must keep at least one page. Restore a page and try again.',
      );
    }
    return buildFromPlan(data, plan);
  },

  /** Concatenates documents in the order supplied. */
  async merge(documents: Uint8Array[]): Promise<Uint8Array> {
    if (documents.length < 2) {
      throw AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'Select at least two PDFs to merge.',
        { details: { received: documents.length } },
      );
    }

    const output = await PDFDocument.create();

    for (const data of documents) {
      const source = await loadDocument(data);
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    }

    if (output.getPageCount() === 0) {
      throw AppError.badRequest(
        ErrorCode.EMPTY_RESULT,
        'The selected files contain no pages to merge.',
      );
    }

    return serialise(output);
  },

  /**
   * Stamps text across the chosen pages. `position: 'center'` draws the
   * classic diagonal watermark; the other eight positions stamp small,
   * upright text near a page edge.
   */
  async addWatermark(data: Uint8Array, options: WatermarkOptions): Promise<Uint8Array> {
    const doc = await loadDocument(data);
    const targets = resolveTargetPages(options.pages, doc.getPageCount());

    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const capHeight = options.fontSize * 0.7;
    const margin = Math.max(24, options.fontSize * 0.5);
    const rotateDeg = options.position === 'center' ? 45 : 0;
    const color = rgb(0.45, 0.45, 0.45);

    for (const pageNumber of targets) {
      const page = doc.getPage(pageNumber - 1);
      const { width, height } = page.getSize();
      const [x, y] = anchorFor(options.position, {
        width,
        height,
        boxWidth: textWidth,
        boxHeight: capHeight,
        margin,
        rotateDeg,
      });

      page.drawText(options.text, {
        x,
        y,
        size: options.fontSize,
        font,
        color,
        opacity: options.opacity,
        rotate: degrees(rotateDeg),
      });
    }

    return serialise(doc);
  },

  /**
   * Numbers the chosen pages in physical page order, starting at
   * `startNumber`, regardless of the order page numbers were supplied in.
   */
  async addPageNumbers(data: Uint8Array, options: PageNumberOptions): Promise<Uint8Array> {
    const doc = await loadDocument(data);
    const targets = resolveTargetPages(options.pages, doc.getPageCount()).slice().sort((a, b) => a - b);

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const capHeight = fontSize * 0.7;
    const margin = 28;
    const color = rgb(0.25, 0.25, 0.25);

    targets.forEach((pageNumber, index) => {
      const page = doc.getPage(pageNumber - 1);
      const label = String(options.startNumber + index);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(label, fontSize);
      const [x, y] = anchorFor(options.position, {
        width,
        height,
        boxWidth: textWidth,
        boxHeight: capHeight,
        margin,
      });

      page.drawText(label, { x, y, size: fontSize, font, color });
    });

    return serialise(doc);
  },

  /**
   * Removes the document's Info dictionary entries (title, author, subject,
   * keywords, creator, producer, and both dates) rather than blanking them,
   * so the fields are genuinely absent from the output, not merely empty.
   *
   * `serialise` then stamps a fresh, non-identifying Producer/Creator and
   * modification date — the same neutral tag every operation's output
   * carries — so the result still doesn't leak anything about its origin.
   */
  async removeMetadata(data: Uint8Array): Promise<Uint8Array> {
    const doc = await loadDocument(data);

    const infoRef = doc.context.trailerInfo.Info;
    if (infoRef) {
      const infoDict = doc.context.lookup(infoRef);
      if (infoDict instanceof PDFDict) {
        for (const key of [
          'Title',
          'Author',
          'Subject',
          'Keywords',
          'Creator',
          'Producer',
          'CreationDate',
          'ModDate',
          'Trapped',
        ]) {
          infoDict.delete(PDFName.of(key));
        }
      }
    }

    return serialise(doc);
  },

  /** Embeds a signature capture as an image on one page. */
  async sign(data: Uint8Array, options: SignOptions): Promise<Uint8Array> {
    const doc = await loadDocument(data);
    const [pageNumber] = validatePageNumbers([options.page], doc.getPageCount());
    const page = doc.getPage(pageNumber! - 1);
    const { width, height } = page.getSize();

    const imageBytes = decodeSignatureImage(options.image);
    let png;
    try {
      png = await doc.embedPng(imageBytes);
    } catch (cause) {
      throw AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        "Your signature couldn't be processed. Please draw it again.",
        { cause },
      );
    }

    const boxWidth = (options.widthPercent / 100) * width;
    const boxHeight = boxWidth * (png.height / png.width);
    const margin = Math.max(24, width * 0.03);
    const [x, y] = anchorFor(options.position, {
      width,
      height,
      boxWidth,
      boxHeight,
      margin,
    });

    page.drawImage(png, { x, y, width: boxWidth, height: boxHeight });

    return serialise(doc);
  },

  /**
   * Builds a new PDF with one page per image, in the order supplied. Each
   * page is sized to match its image exactly (one image pixel per point), so
   * the photo fills the page edge to edge with nothing cropped or distorted.
   */
  async fromImages(images: SourceImage[]): Promise<Uint8Array> {
    if (images.length === 0) {
      throw AppError.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'Add at least one image to convert.',
      );
    }

    const output = await PDFDocument.create();

    for (const image of images) {
      let embedded;
      try {
        if (looksLikeJpeg(image.data)) {
          embedded = await output.embedJpg(image.data);
        } else if (looksLikePng(image.data)) {
          embedded = await output.embedPng(image.data);
        } else {
          throw AppError.badRequest(
            ErrorCode.INVALID_IMAGE,
            `"${image.filename}" isn't a JPG or PNG file.`,
          );
        }
      } catch (cause) {
        if (cause instanceof AppError) throw cause;
        throw AppError.badRequest(
          ErrorCode.INVALID_IMAGE,
          `"${image.filename}" couldn't be read as an image. It may be corrupted.`,
          { cause },
        );
      }

      const page = output.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }

    return serialise(output);
  },
};
