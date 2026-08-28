import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../services/apiClient';
import { pdfApi } from '../services/pdfApi';
import type { ApiFile, UploadResponse } from '../types';
import { validatePdfFile } from '../lib/validateFile';
import type { UploadOptions } from '../services/apiClient';

export type UploadStatus = 'uploading' | 'succeeded' | 'failed' | 'cancelled';

export interface UploadTask<T> {
  localId: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  result?: T;
}

interface UseUploadQueueOptions<T extends { file: ApiFile }> {
  maxFileSizeBytes: number;
  /** Called once per file that uploads successfully. */
  onUploaded?: (response: T, file: File) => void;
  /** Called when a file is rejected locally or by the server. */
  onFailed?: (message: string, file: File) => void;
  /** Defaults to the PDF upload endpoint. */
  uploadFn?: (file: File, options: UploadOptions) => Promise<T>;
  /** Client-side pre-flight check. Defaults to PDF validation. */
  validate?: (file: File, maxBytes: number) => string | null;
}

let taskCounter = 0;

const defaultUploadFn = (file: File, options: UploadOptions) =>
  pdfApi.upload(file, options) as Promise<UploadResponse>;

/**
 * Manages a queue of file uploads with per-file progress, cancellation and
 * human-readable failures.
 *
 * Shared by the landing page (one PDF at a time), the merge panel (several
 * PDFs) and the images-to-PDF page (several images, via `uploadFn`), so every
 * upload surface in the app behaves identically.
 */
export function useUploadQueue<T extends { file: ApiFile } = UploadResponse>({
  maxFileSizeBytes,
  onUploaded,
  onFailed,
  uploadFn = defaultUploadFn as unknown as (file: File, options: UploadOptions) => Promise<T>,
  validate = validatePdfFile,
}: UseUploadQueueOptions<T>) {
  const [tasks, setTasks] = useState<UploadTask<T>[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const mounted = useRef(true);

  useEffect(() => {
    const inFlight = controllers.current;
    mounted.current = true;

    return () => {
      mounted.current = false;
      // Abandon anything still uploading when the surface goes away.
      inFlight.forEach((controller) => controller.abort());
      inFlight.clear();
    };
  }, []);

  const update = useCallback((localId: string, patch: Partial<UploadTask<T>>) => {
    if (!mounted.current) return;
    setTasks((current) =>
      current.map((task) => (task.localId === localId ? { ...task, ...patch } : task)),
    );
  }, []);

  const enqueue = useCallback(
    (files: File[]) => {
      const accepted: UploadTask<T>[] = [];

      for (const file of files) {
        const problem = validate(file, maxFileSizeBytes);
        if (problem) {
          onFailed?.(problem, file);
          continue;
        }

        accepted.push({
          localId: `upload-${++taskCounter}`,
          file,
          progress: 0,
          status: 'uploading',
        });
      }

      if (accepted.length === 0) return;
      setTasks((current) => [...current, ...accepted]);

      for (const task of accepted) {
        const controller = new AbortController();
        controllers.current.set(task.localId, controller);

        uploadFn(task.file, {
          signal: controller.signal,
          onProgress: (progress) => update(task.localId, { progress }),
        })
          .then((result) => {
            controllers.current.delete(task.localId);
            update(task.localId, { status: 'succeeded', progress: 100, result });
            onUploaded?.(result, task.file);
          })
          .catch((error: unknown) => {
            controllers.current.delete(task.localId);

            if (error instanceof ApiError && error.code === 'CANCELLED') {
              update(task.localId, { status: 'cancelled' });
              return;
            }

            const message =
              error instanceof ApiError
                ? error.message
                : 'We could not upload this file. Please try again.';

            update(task.localId, { status: 'failed', error: message });
            onFailed?.(message, task.file);
          });
      }
    },
    [maxFileSizeBytes, onFailed, onUploaded, uploadFn, update, validate],
  );

  const cancel = useCallback((localId: string) => {
    controllers.current.get(localId)?.abort();
    controllers.current.delete(localId);
  }, []);

  const remove = useCallback(
    (localId: string) => {
      cancel(localId);
      setTasks((current) => current.filter((task) => task.localId !== localId));
    },
    [cancel],
  );

  const clear = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    setTasks([]);
  }, []);

  return {
    tasks,
    enqueue,
    cancel,
    remove,
    clear,
    isUploading: tasks.some((task) => task.status === 'uploading'),
  };
}
