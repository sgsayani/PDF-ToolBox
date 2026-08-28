import { CheckCircle2, FileX2 } from 'lucide-react';

import { findTool } from '../../lib/tools';
import type { PdfMetadataView } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import { ToolPanel } from './ToolPanel';

interface MetadataPanelProps {
  metadata: PdfMetadataView | undefined;
  isLoading: boolean;
  isError: boolean;
}

const FIELDS: { key: keyof PdfMetadataView; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'creator', label: 'Creator application' },
  { key: 'producer', label: 'Producer' },
];

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function MetadataPanel({ metadata, isLoading, isError }: MetadataPanelProps) {
  return (
    <ToolPanel tool={findTool('metadata')}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : isError || !metadata ? (
        <p className="text-[12.5px] text-danger">Couldn’t read this document’s metadata.</p>
      ) : (
        <>
          <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
              {metadata.hasMetadata ? (
                <CheckCircle2 className="size-3.5 text-ink-subtle" aria-hidden="true" />
              ) : (
                <FileX2 className="size-3.5 text-ink-subtle" aria-hidden="true" />
              )}
              {metadata.hasMetadata ? 'Metadata found' : 'No metadata found'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              {metadata.hasMetadata
                ? 'This document carries the details below, which may include information about who created or edited it.'
                : 'This document has no title, author or other identifying details set.'}
            </p>
          </div>

          {metadata.hasMetadata && (
            <dl className="space-y-2 text-[12.5px]">
              {FIELDS.map(({ key, label }) => {
                const raw = metadata[key];
                const value = typeof raw === 'string' ? raw : null;
                if (!value) return null;
                return (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-ink-subtle">{label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-ink" title={value}>
                      {value}
                    </dd>
                  </div>
                );
              })}
              {metadata.creationDate && (
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink-subtle">Created</dt>
                  <dd className="text-right font-medium text-ink">
                    {formatDate(metadata.creationDate)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            {metadata.hasMetadata
              ? 'Removing metadata produces a cleaned copy with these details stripped out.'
              : 'There is nothing to remove, but you can still download a copy with these fields cleared.'}
          </p>
        </>
      )}
    </ToolPanel>
  );
}
