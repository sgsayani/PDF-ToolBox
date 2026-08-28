import type {
  ApiFile,
  CompressionLevel,
  CompressResponse,
  ExtractedTextResponse,
  FormFieldValue,
  FormInspection,
  FractionRect,
  HealthResponse,
  ImageExportResponse,
  OcrLanguage,
  OcrResponse,
  OperationResponse,
  PageDraft,
  PageNumberPosition,
  PageTarget,
  PdfMetadataView,
  PositionPreset,
  RedactionArea,
  TranslateLanguage,
  TranslateResponse,
  UploadResponse,
} from '../types';
import { downloadUrl, requestJson, uploadFile, type UploadOptions } from './apiClient';

/** Converts the workspace's page plan into the wire format. */
function toPlan(pages: PageDraft[]): { source: number; rotate: number }[] {
  return pages.map((page) => ({
    source: page.source,
    // Normalised to the 0–270 range the API accepts.
    rotate: ((Math.round(page.rotation / 90) * 90) % 360 + 360) % 360,
  }));
}

export const pdfApi = {
  health(): Promise<HealthResponse> {
    return requestJson<HealthResponse>('/health');
  },

  upload(file: File, options?: UploadOptions): Promise<UploadResponse> {
    return uploadFile<UploadResponse>('/files', file, options);
  },

  /**
   * Commits a whole editing session — deletions, new order and rotations — as
   * one request.
   */
  organize(fileId: string, pages: PageDraft[]): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/organize', {
      method: 'POST',
      body: JSON.stringify({ fileId, pages: toPlan(pages) }),
    });
  },

  /**
   * Extracts the given pages into a new document, keeping whatever order and
   * rotation the user set up in the workspace.
   */
  split(fileId: string, pages: PageDraft[]): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/split', {
      method: 'POST',
      body: JSON.stringify({ fileId, pages: toPlan(pages) }),
    });
  },

  merge(fileIds: string[]): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/merge', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  },

  watermark(
    fileId: string,
    options: {
      text: string;
      position: PositionPreset;
      opacity: number;
      fontSize: number;
      pages: PageTarget;
    },
  ): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/watermark', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  },

  pageNumbers(
    fileId: string,
    options: { position: PageNumberPosition; startNumber: number; pages: PageTarget },
  ): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/page-numbers', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  },

  removeMetadata(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/remove-metadata', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  /** Fetches the document metadata for a stored file without changing it. */
  metadata(fileId: string): Promise<{ metadata: PdfMetadataView }> {
    return requestJson<{ metadata: PdfMetadataView }>(`/files/${fileId}/metadata`);
  },

  sign(
    fileId: string,
    options: { page: number; position: PositionPreset; widthPercent: number; image: string },
  ): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/sign', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  },

  protect(fileId: string, password: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/security/protect', {
      method: 'POST',
      body: JSON.stringify({ fileId, password }),
    });
  },

  /**
   * Unlocks a password-protected PDF in one request — the normal upload
   * endpoint rejects encrypted files, so there's no existing `fileId` to
   * reference here, and the file and its password travel together instead.
   */
  removePassword(
    file: File,
    password: string,
    options?: Omit<UploadOptions, 'fields'>,
  ): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/security/remove-password', file, {
      ...options,
      fields: { password },
    });
  },

  /** Rasterizes the chosen pages to JPEG. Returns a ZIP too when there's more than one. */
  toJpg(fileId: string, pages: PageTarget): Promise<ImageExportResponse> {
    return requestJson<ImageExportResponse>('/pdf/to-jpg', {
      method: 'POST',
      body: JSON.stringify({ fileId, pages }),
    });
  },

  /** Reads the document's text layer for the Extract Text viewer. */
  extractedText(fileId: string): Promise<ExtractedTextResponse> {
    return requestJson<ExtractedTextResponse>(`/files/${fileId}/extracted-text`);
  },

  toWord(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/to-word', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  /** Recognizes text on the given pages and, optionally, builds a searchable PDF. */
  ocr(
    fileId: string,
    options: { pages: PageTarget; language: OcrLanguage; generateSearchablePdf: boolean },
  ): Promise<OcrResponse> {
    return requestJson<OcrResponse>('/pdf/ocr', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  },

  scannerCleanup(
    fileId: string,
    options: {
      pages: PageTarget;
      grayscale: boolean;
      brightness: number;
      contrast: number;
      rotate: number;
      denoise: boolean;
      cleanBackground: boolean;
    },
  ): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/scanner-cleanup', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  },

  /** Releases a working file. Best-effort: failures are not surfaced. */
  async release(fileId: string): Promise<void> {
    try {
      await requestJson<void>(`/files/${fileId}`, { method: 'DELETE' });
    } catch {
      // The server expires files on its own; this is only an early cleanup.
    }
  },

  /** Fetches a produced file so it can be previewed or edited further. */
  async fetchBlob(file: ApiFile): Promise<Blob> {
    const response = await fetch(downloadUrl(file.id));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${file.id}`);
    }
    return response.blob();
  },

  /** Reads a document's AcroForm fields for the fill-form tool. */
  form(fileId: string): Promise<FormInspection> {
    return requestJson<FormInspection>(`/files/${fileId}/form`);
  },

  fillForm(
    fileId: string,
    values: { name: string; value: FormFieldValue }[],
  ): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/fill-form', {
      method: 'POST',
      body: JSON.stringify({ fileId, values }),
    });
  },

  compress(fileId: string, level: CompressionLevel): Promise<CompressResponse> {
    return requestJson<CompressResponse>('/pdf/compress', {
      method: 'POST',
      body: JSON.stringify({ fileId, level }),
    });
  },

  crop(fileId: string, pages: PageTarget, rect: FractionRect): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/crop', {
      method: 'POST',
      body: JSON.stringify({ fileId, pages, rect }),
    });
  },

  redact(fileId: string, areas: RedactionArea[]): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/redact', {
      method: 'POST',
      body: JSON.stringify({ fileId, areas }),
    });
  },

  translate(
    fileId: string,
    targetLang: TranslateLanguage,
    sourceLang?: TranslateLanguage,
  ): Promise<TranslateResponse> {
    return requestJson<TranslateResponse>('/pdf/translate', {
      method: 'POST',
      body: JSON.stringify({ fileId, targetLang, sourceLang }),
    });
  },

  toExcel(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/to-excel', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  toCsv(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/to-csv', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  toHtml(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/to-html', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  toPptx(fileId: string): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/pdf/to-pptx', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  downloadUrl,
};
