import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

import { HowItWorks } from '../components/landing/HowItWorks';
import { PrivacyNote } from '../components/landing/PrivacyNote';
import { ToolCatalogue } from '../components/landing/ToolCatalogue';
import { Dropzone } from '../components/upload/Dropzone';
import { UploadTaskRow } from '../components/upload/UploadTaskRow';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { useWorkspaceDocument } from '../hooks/useWorkspaceDocument';
import type { UploadResponse } from '../types';

export function LandingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { open } = useWorkspaceDocument();
  const { maxFileSizeBytes, fileTtlMinutes } = useLimits();

  const handleUploaded = useCallback(
    (response: UploadResponse, file: File) => {
      open({
        fileId: response.file.id,
        filename: response.file.filename,
        size: response.file.size,
        pageCount: response.file.pageCount,
        expiresAt: response.file.expiresAt,
        blob: file,
      });
      void navigate('/workspace');
    },
    [navigate, open],
  );

  const handleFailed = useCallback(
    (message: string) => toast.error('Upload failed', message),
    [toast],
  );

  const { tasks, enqueue, cancel, remove } = useUploadQueue({
    maxFileSizeBytes,
    onUploaded: handleUploaded,
    onFailed: handleFailed,
  });

  // Single-document flow: only the most recent attempt is relevant here.
  const currentTask = tasks.at(-1);
  const isBusy = currentTask?.status === 'uploading';

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
          <div className="max-w-xl">
            <p className="text-[12.5px] font-semibold tracking-[0.06em] text-accent uppercase">
              PDF workspace
            </p>
            <h1 className="mt-3 text-[34px] leading-[1.12] font-semibold tracking-[-0.028em] text-ink sm:text-[42px]">
              Everything you need to work with PDFs, in one place.
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-ink-muted">
              Upload a document once, then organise, split or merge it without hopping between
              single-purpose tools. Every change is visible before you commit to it.
            </p>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ['Reorder, rotate, delete', 'On one page canvas'],
                ['Split & extract', 'By selection or range'],
                ['Merge', 'Any number of files'],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-[13.5px] font-medium text-ink">{term}</dt>
                  <dd className="text-[12.5px] text-ink-subtle">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:sticky lg:top-24">
            {currentTask && currentTask.status !== 'succeeded' ? (
              <div className="space-y-3">
                <UploadTaskRow
                  task={currentTask}
                  onCancel={cancel}
                  onRemove={remove}
                  onRetry={(task) => {
                    remove(task.localId);
                    enqueue([task.file]);
                  }}
                />
                {!isBusy && (
                  <Dropzone
                    onFiles={enqueue}
                    maxFileSizeBytes={maxFileSizeBytes}
                    variant="compact"
                  />
                )}
              </div>
            ) : (
              <Dropzone onFiles={enqueue} maxFileSizeBytes={maxFileSizeBytes} disabled={isBusy} />
            )}

            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-subtle">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Your file is stored temporarily while you work on it and deleted automatically
                within {fileTtlMinutes} minutes. Nothing is kept afterwards.
              </span>
            </p>
          </div>
        </div>
      </section>

      <ToolCatalogue />
      <HowItWorks />
      <PrivacyNote />
    </>
  );
}
