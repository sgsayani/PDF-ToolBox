import type { OperationResponse } from '../types';
import { uploadFile, type UploadOptions } from './apiClient';

/**
 * A small, separate surface from `pdfApi`, mirroring `imagesApi`: a Word
 * document is a different resource from the PDF the rest of the app centres
 * around, used only by the standalone Word → PDF converter.
 */
export const documentsApi = {
  /** Uploads a .docx and converts it in one request — there's nothing to configure in between. */
  toPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/to-pdf', file, options);
  },

  excelToPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/excel-to-pdf', file, options);
  },

  csvToPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/csv-to-pdf', file, options);
  },

  pptxToPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/pptx-to-pdf', file, options);
  },

  htmlToPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/html-to-pdf', file, options);
  },

  textToPdf(file: File, options?: UploadOptions): Promise<OperationResponse> {
    return uploadFile<OperationResponse>('/documents/text-to-pdf', file, options);
  },
};
