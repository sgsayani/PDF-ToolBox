import type { ApiFile, OperationResponse } from '../types';
import { requestJson, uploadFile, type UploadOptions } from './apiClient';

export interface ImageUploadResponse {
  file: ApiFile;
}

/**
 * A small, separate surface from `pdfApi`: images are a different resource
 * from the PDF the rest of the app centres around, used only by the
 * standalone Images → PDF converter.
 */
export const imagesApi = {
  upload(file: File, options?: UploadOptions): Promise<ImageUploadResponse> {
    return uploadFile<ImageUploadResponse>('/images', file, options);
  },

  toPdf(fileIds: string[]): Promise<OperationResponse> {
    return requestJson<OperationResponse>('/images/to-pdf', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  },
};
