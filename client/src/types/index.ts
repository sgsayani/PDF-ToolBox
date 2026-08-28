/** The kinds of file the server's temporary store can hold. */
export type StoredFileKind = 'pdf' | 'jpg' | 'png' | 'txt' | 'docx' | 'zip';

/** A working file held by the server for the duration of a session. */
export interface ApiFile {
  id: string;
  filename: string;
  size: number;
  pageCount: number;
  kind: StoredFileKind;
  /** ISO timestamp after which the server discards the file. */
  expiresAt: string;
}

/** Geometry of one page as stored in the document. */
export interface PageInfo {
  number: number;
  width: number;
  height: number;
  rotation: number;
}

export interface UploadResponse {
  file: ApiFile;
  pages: PageInfo[];
}

export interface OperationResponse {
  operation: PdfOperation;
  file: ApiFile;
  durationMs: number;
}

export interface HealthResponse {
  status: string;
  historyEnabled: boolean;
  accountsEnabled: boolean;
  limits: {
    maxFileSizeMb: number;
    maxFilesPerRequest: number;
    fileTtlMinutes: number;
  };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export type PlanId = 'free';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface UsageResponse {
  plan: PlanId;
  limits: { maxProcessingPerDay: number; maxFileSizeMb: number };
  usage: { processedToday: number; remainingToday: number };
}

/** One entry in a user's processing history — the same facts `/api/stats` aggregates, scoped to one account. */
export interface HistoryEntry {
  id: string;
  operation: string;
  status: 'succeeded' | 'failed';
  inputs: { filename: string; size: number; pageCount: number }[];
  output: { filename: string; size: number; pageCount: number } | null;
  durationMs: number;
  errorCode: string | null;
  createdAt: string;
}

/** A file a user has chosen to keep past its normal expiry. */
export interface SavedFileEntry {
  id: string;
  filename: string;
  size: number;
  pageCount: number;
  kind: StoredFileKind;
  createdAt: string;
}

export type PdfOperation =
  | 'organize'
  | 'split'
  | 'merge'
  | 'watermark'
  | 'page-numbers'
  | 'remove-metadata'
  | 'sign'
  | 'protect'
  | 'to-jpg'
  | 'to-word'
  | 'images-to-pdf'
  | 'scanner-cleanup';

/** Response from converting PDF pages to JPEGs — one or many, plus an optional ZIP bundle. */
export interface ImageExportResponse {
  operation: 'to-jpg';
  files: ApiFile[];
  zip: ApiFile | null;
  durationMs: number;
}

/** Response from reading a PDF's text layer. */
export interface ExtractedTextResponse {
  /** One entry per page, in order. Empty string for a page with no text. */
  pages: string[];
  hasText: boolean;
}

/** Languages OCR can recognize. A curated subset, not Tesseract's full list. */
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

/** One page's recognized text from OCR. */
export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

/** Response from running OCR — always includes text; `file` is a searchable PDF, when requested. */
export interface OcrResponse {
  operation: 'ocr';
  pages: OcrPageResult[];
  meanConfidence: number;
  lowQuality: boolean;
  file: ApiFile | null;
  durationMs: number;
}

/**
 * A 3x3 anchor grid for placing a stamp on a page. `center` is the middle of
 * the middle row; used for a watermark it renders diagonally, otherwise it
 * (like every other position) sits upright.
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

/** Page numbers only ever sit along a top or bottom edge. */
export const PAGE_NUMBER_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const satisfies readonly PositionPreset[];

export type PageNumberPosition = (typeof PAGE_NUMBER_POSITIONS)[number];

/** Which pages an effect applies to: every page, or a specific set. */
export type PageTarget = 'all' | number[];

/** Basic document metadata, as read from a PDF's Info dictionary. */
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
  hasMetadata: boolean;
}

/**
 * One page in the workspace's working plan.
 *
 * `source` points at a page in the *uploaded* document; `rotation` is the
 * quarter-turn delta the user has applied on top of whatever the page already
 * had. `key` is stable across reordering so React and drag-and-drop can track
 * a page as it moves.
 */
export interface PageDraft {
  key: string;
  source: number;
  rotation: number;
}

/** The document currently open in the workspace. */
export interface WorkspaceDocument {
  fileId: string;
  filename: string;
  size: number;
  pageCount: number;
  /** Local bytes, used to render previews without downloading again. */
  blob: Blob;
  expiresAt: string;
}

/** An additional file queued for merging. */
export interface MergeCandidate {
  localId: string;
  filename: string;
  size: number;
  pageCount: number;
  fileId: string;
}

export type WorkspaceTool =
  | 'organize'
  | 'split'
  | 'merge'
  | 'watermark'
  | 'page-numbers'
  | 'metadata'
  | 'sign'
  | 'protect'
  | 'to-jpg'
  | 'extract-text'
  | 'to-word'
  | 'fill-form'
  | 'ocr'
  | 'scanner-cleanup';

/** The field kinds `fill-form` actually fills; anything else is `'unsupported'`. */
export type FormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionList' | 'unsupported';

export interface FormFieldInfo {
  name: string;
  type: FormFieldType;
  required: boolean;
  readOnly: boolean;
  options?: string[];
  multiselect?: boolean;
  currentValue?: string | boolean | string[];
}

export interface FormInspection {
  pageCount: number;
  hasFields: boolean;
  fields: FormFieldInfo[];
}

/** One field's value as submitted for filling — matches `FormFieldInfo.currentValue`'s shape. */
export type FormFieldValue = string | boolean | string[];

/** An image queued for the images → PDF converter. */
export interface ImageCandidate {
  localId: string;
  fileId: string;
  filename: string;
  size: number;
  /** A local object URL for an instant thumbnail — no server round trip needed. */
  previewUrl: string;
}
