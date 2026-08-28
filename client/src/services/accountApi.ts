import { downloadUrl as buildDownloadUrl, requestJson } from './apiClient';
import type { HistoryEntry, SavedFileEntry, UsageResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const accountApi = {
  usage(): Promise<UsageResponse> {
    return requestJson<UsageResponse>('/account/usage');
  },

  history(): Promise<{ jobs: HistoryEntry[] }> {
    return requestJson<{ jobs: HistoryEntry[] }>('/account/history');
  },

  deleteHistoryEntry(id: string): Promise<void> {
    return requestJson<void>(`/account/history/${id}`, { method: 'DELETE' });
  },

  clearHistory(): Promise<void> {
    return requestJson<void>('/account/history', { method: 'DELETE' });
  },

  savedFiles(): Promise<{ files: SavedFileEntry[] }> {
    return requestJson<{ files: SavedFileEntry[] }>('/account/saved-files');
  },

  /** Copies an existing processing result into permanent storage. */
  saveFile(fileId: string): Promise<{ file: SavedFileEntry }> {
    return requestJson<{ file: SavedFileEntry }>('/account/saved-files', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  deleteSavedFile(id: string): Promise<void> {
    return requestJson<void>(`/account/saved-files/${id}`, { method: 'DELETE' });
  },

  /** Absolute URL for downloading a saved file — used directly as an `<a href>`, like `pdfApi.downloadUrl`. */
  savedFileDownloadUrl(id: string): string {
    return `${API_BASE_URL}/api/account/saved-files/${id}/download`;
  },

  /** Re-exported so callers that mix ephemeral and saved files only import one module. */
  downloadUrl: buildDownloadUrl,
};
