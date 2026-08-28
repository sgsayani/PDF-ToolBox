import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus } from 'lucide-react';

import { ImageFileList } from '../components/workspace/ImageFileList';
import { ResultDialog } from '../components/workspace/ResultDialog';
import { Dropzone } from '../components/upload/Dropzone';
import { UploadTaskRow } from '../components/upload/UploadTaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Logo } from '../components/ui/Logo';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { formatFileCount } from '../lib/format';
import { validateImageFile } from '../lib/validateFile';
import { ApiError } from '../services/apiClient';
import { imagesApi, type ImageUploadResponse } from '../services/imagesApi';
import { pdfApi } from '../services/pdfApi';
import type { ApiFile, ImageCandidate } from '../types';

/**
 * The one tool that doesn't operate on an already-open PDF: it *builds* one
 * from images, so it gets its own page instead of a workspace panel — there
 * is nothing to open a workspace around yet.
 */
export function ImagesToPdfPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { maxFileSizeBytes, maxFilesPerRequest } = useLimits();

  const [entries, setEntries] = useState<ImageCandidate[]>([]);
  const [result, setResult] = useState<ApiFile | null>(null);

  // Object URLs are only ever read by this page, so they're revoked as soon
  // as an image leaves the list or the page unmounts.
  useEffect(() => {
    return () => {
      entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploaded = useCallback((response: ImageUploadResponse, file: File) => {
    setEntries((current) => [
      ...current,
      {
        localId: `image-${response.file.id}`,
        fileId: response.file.id,
        filename: response.file.filename,
        size: response.file.size,
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  }, []);

  const handleFailed = useCallback(
    (message: string) => toast.error('Could not add image', message),
    [toast],
  );

  const uploads = useUploadQueue({
    maxFileSizeBytes,
    uploadFn: (file, options) => imagesApi.upload(file, options),
    validate: validateImageFile,
    onUploaded: handleUploaded,
    onFailed: handleFailed,
  });

  const convertMutation = useMutation({
    mutationFn: (fileIds: string[]) => imagesApi.toPdf(fileIds),
    onSuccess: (response) => setResult(response.file),
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : 'We could not convert these images.';
      toast.error('Conversion failed', message);
    },
  });

  const removeEntry = useCallback((localId: string) => {
    setEntries((current) => {
      const entry = current.find((item) => item.localId === localId);
      if (entry) {
        URL.revokeObjectURL(entry.previewUrl);
        void pdfApi.release(entry.fileId);
      }
      return current.filter((item) => item.localId !== localId);
    });
  }, []);

  const startOver = useCallback(() => {
    entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    setEntries([]);
    setResult(null);
    uploads.clear();
  }, [entries, uploads]);

  const isProcessing = convertMutation.isPending;
  const atCapacity = entries.length >= maxFilesPerRequest;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="flex h-15 items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft />}
            onClick={() => void navigate('/')}
          >
            <span className="hidden sm:inline">Back</span>
          </Button>
          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
          <div className="hidden shrink-0 sm:block">
            <Logo />
          </div>
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[13.5px] font-semibold text-ink">Images to PDF</h1>
            <p className="truncate text-[12px] text-ink-subtle">
              {entries.length === 0 ? 'No images added yet' : formatFileCount(entries.length)}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={entries.length === 0 || uploads.isUploading || isProcessing}
            loading={isProcessing}
            onClick={() => convertMutation.mutate(entries.map((entry) => entry.fileId))}
          >
            Convert to PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-ink">Build a PDF from images</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Add JPG or PNG images, drag to set their order, then convert. Each image becomes one
            page.
          </p>
        </div>

        {entries.length === 0 && uploads.tasks.length === 0 ? (
          <EmptyState
            icon={<ImagePlus />}
            title="No images yet"
            description="Drag and drop JPG or PNG files below to get started."
          />
        ) : (
          <ImageFileList
            entries={entries}
            disabled={isProcessing}
            onReorder={setEntries}
            onRemove={removeEntry}
          />
        )}

        <div className="mt-3">
          <Dropzone
            variant="compact"
            multiple
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            extensions={['.jpg', '.jpeg', '.png']}
            fileTypeLabel={['image', 'images']}
            maxFileSizeBytes={maxFileSizeBytes}
            disabled={isProcessing || atCapacity}
            onFiles={uploads.enqueue}
          />
          {atCapacity && (
            <p className="mt-2 text-[12.5px] text-warning">
              You've reached the limit of {maxFilesPerRequest} images.
            </p>
          )}
        </div>

        {uploads.tasks.filter((task) => task.status !== 'succeeded').length > 0 && (
          <div className="mt-3 space-y-2">
            {uploads.tasks
              .filter((task) => task.status !== 'succeeded')
              .map((task) => (
                <UploadTaskRow
                  key={task.localId}
                  task={task}
                  onCancel={uploads.cancel}
                  onRemove={uploads.remove}
                  onRetry={(failed) => {
                    uploads.remove(failed.localId);
                    uploads.enqueue([failed.file]);
                  }}
                />
              ))}
          </div>
        )}
      </main>

      <ResultDialog
        result={result}
        continuing={false}
        onClose={() => setResult(null)}
        onContinueEditing={() => {}}
        onStartOver={startOver}
        allowContinueEditing={false}
      />
    </div>
  );
}
