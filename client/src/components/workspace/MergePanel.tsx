import { formatFileCount, formatPageCount } from '../../lib/format';
import { findTool } from '../../lib/tools';
import type { MergeCandidate } from '../../types';
import { Dropzone } from '../upload/Dropzone';
import { ToolPanel } from './ToolPanel';

interface MergePanelProps {
  entries: MergeCandidate[];
  maxFiles: number;
  maxFileSizeBytes: number;
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

export function MergePanel({
  entries,
  maxFiles,
  maxFileSizeBytes,
  disabled,
  onFiles,
}: MergePanelProps) {
  const atCapacity = entries.length >= maxFiles;
  const totalPages = entries.reduce((sum, entry) => sum + entry.pageCount, 0);

  return (
    <ToolPanel tool={findTool('merge')}>
      <Dropzone
        variant="compact"
        multiple
        maxFileSizeBytes={maxFileSizeBytes}
        disabled={disabled || atCapacity}
        onFiles={onFiles}
      />

      {atCapacity && (
        <p className="text-[12.5px] text-warning">
          You have reached the limit of {maxFiles} files in one merge.
        </p>
      )}

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
          Result
        </p>
        <p className="mt-1 text-[12.5px] text-ink">
          {entries.length < 2 ? (
            <span className="text-ink-muted">Add at least one more PDF to merge</span>
          ) : (
            <>
              {formatFileCount(entries.length)} · {formatPageCount(totalPages)}
            </>
          )}
        </p>
      </div>
    </ToolPanel>
  );
}
