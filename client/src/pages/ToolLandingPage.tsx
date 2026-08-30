import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { Dropzone } from '../components/upload/Dropzone';
import { UploadTaskRow } from '../components/upload/UploadTaskRow';
import { Seo } from '../components/seo/Seo';
import { SupportingContent } from '../components/seo/SupportingContent';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { useWorkspaceDocument } from '../hooks/useWorkspaceDocument';
import { findTool } from '../lib/tools';
import type { ToolLandingContent } from '../lib/toolLandingContent';
import { breadcrumbLd, faqPageLd, webApplicationLd } from '../lib/structuredData';
import type { UploadResponse } from '../types';

/**
 * One template behind every tool-specific landing page (/merge-pdf,
 * /compress-pdf, ...) instead of a near-duplicate file per tool. The tool
 * itself is the real Workspace panel — uploading here opens the workspace
 * with that panel already selected, via `initialTool` — so this is a genuine
 * entry point, not a doorway page describing a feature found elsewhere.
 */
export function ToolLandingPage({ content }: { content: ToolLandingContent }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { open } = useWorkspaceDocument();
  const { maxFileSizeBytes, fileTtlMinutes } = useLimits();
  const definition = findTool(content.tool);
  const Icon = definition.icon;

  const handleUploaded = useCallback(
    (response: UploadResponse, file: File) => {
      open({
        fileId: response.file.id,
        filename: response.file.filename,
        size: response.file.size,
        pageCount: response.file.pageCount,
        expiresAt: response.file.expiresAt,
        blob: file,
        initialTool: content.tool,
      });
      void navigate('/workspace');
    },
    [content.tool, navigate, open],
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

  const currentTask = tasks.at(-1);
  const isBusy = currentTask?.status === 'uploading';

  return (
    <>
      <Seo
        title={content.h1}
        description={content.metaDescription}
        path={content.slug}
        jsonLd={[
          webApplicationLd({ name: content.h1, description: content.metaDescription, path: content.slug }),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: content.navLabel, path: content.slug },
          ]),
          ...(content.faq.length > 0 ? [faqPageLd(content.faq)] : []),
        ]}
      />

      <section className="mx-auto max-w-3xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-subtle">
          <Link to="/" className="rounded-sm hover:text-ink">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="text-ink-muted">{content.navLabel}</span>
        </nav>

        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
          >
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
              {content.h1}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-muted">{content.intro}</p>
          </div>
        </div>

        <div className="mt-8">
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
              {!isBusy && <Dropzone onFiles={enqueue} maxFileSizeBytes={maxFileSizeBytes} variant="compact" />}
            </div>
          ) : (
            <Dropzone onFiles={enqueue} maxFileSizeBytes={maxFileSizeBytes} disabled={isBusy} />
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-subtle">
            Files are processed temporarily and deleted automatically within {fileTtlMinutes} minutes.
          </p>
        </div>
      </section>

      <div className="border-t border-line bg-surface">
        <SupportingContent
          howItWorks={content.howItWorks}
          features={content.features}
          faq={content.faq}
          related={content.related}
        />
      </div>
    </>
  );
}
