import { FileX2, FileText, ScanText } from 'lucide-react';

import { findTool } from '../../lib/tools';
import { formatPageCount } from '../../lib/format';
import { Button } from '../ui/Button';
import { ToolPanel } from './ToolPanel';

interface ExtractTextPanelProps {
  pages: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
  hasText: boolean;
  onTryOcr: () => void;
}

export function ExtractTextPanel({ pages, isLoading, isError, hasText, onTryOcr }: ExtractTextPanelProps) {
  const pagesWithText = pages?.filter((page) => page.trim().length > 0).length ?? 0;

  return (
    <ToolPanel tool={findTool('extract-text')}>
      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
          {isLoading ? (
            'Reading document'
          ) : isError ? (
            'Could not read text'
          ) : hasText ? (
            <>
              <FileText className="size-3.5" aria-hidden="true" />
              Text found
            </>
          ) : (
            <>
              <FileX2 className="size-3.5" aria-hidden="true" />
              No text found
            </>
          )}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          {isLoading
            ? 'Reading the text layer…'
            : isError
              ? "We couldn't read this document's text."
              : hasText
                ? `Found text on ${formatPageCount(pagesWithText)} of ${pages?.length ?? 0}.`
                : 'This document has no text layer — it may be a scanned image.'}
        </p>
      </div>

      {!isLoading && !isError && !hasText && (
        <Button variant="secondary" icon={<ScanText />} onClick={onTryOcr}>
          Try OCR instead
        </Button>
      )}
    </ToolPanel>
  );
}
