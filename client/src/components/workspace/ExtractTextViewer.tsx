import { Copy, FileX2, ScanText } from 'lucide-react';

import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

interface ExtractTextViewerProps {
  pages: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
  hasText: boolean;
  onTryOcr: () => void;
}

/** Joins per-page text with a visible page marker, for a readable single view. */
function joinPages(pages: string[]): string {
  return pages
    .map((page, index) => `── Page ${index + 1} ──\n\n${page || '(no text on this page)'}`)
    .join('\n\n');
}

export function ExtractTextViewer({ pages, isLoading, isError, hasText, onTryOcr }: ExtractTextViewerProps) {
  const toast = useToast();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 sm:p-6">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<FileX2 />}
        title="We couldn't read this document's text"
        description="The file may be corrupted or password-protected."
        className="p-4 sm:p-6"
      />
    );
  }

  if (!pages || !hasText) {
    return (
      <EmptyState
        icon={<FileX2 />}
        title="No extractable text"
        description="This document has no text layer — it may be a scanned image."
        action={
          <Button variant="secondary" icon={<ScanText />} onClick={onTryOcr}>
            Try OCR instead
          </Button>
        }
        className="p-4 sm:p-6"
      />
    );
  }

  const fullText = joinPages(pages);

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-ink">Extracted text</h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<Copy />}
          onClick={() => {
            void navigator.clipboard.writeText(fullText).then(
              () => toast.success('Copied', 'Text copied to your clipboard.'),
              () => toast.error('Could not copy', 'Your browser blocked clipboard access.'),
            );
          }}
        >
          Copy text
        </Button>
      </div>

      <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-line bg-surface p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
        {fullText}
      </pre>
    </div>
  );
}
