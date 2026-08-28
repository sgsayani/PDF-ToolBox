import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';

import { formatBytes, formatPageCount } from '../../lib/format';
import type { UploadTask } from '../../hooks/useUploadQueue';
import type { ApiFile } from '../../types';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';

interface UploadTaskRowProps<T extends { file: ApiFile }> {
  task: UploadTask<T>;
  onCancel: (localId: string) => void;
  onRemove: (localId: string) => void;
  onRetry?: (task: UploadTask<T>) => void;
}

/** One file in the upload queue, from in-progress through success or failure. */
export function UploadTaskRow<T extends { file: ApiFile }>({
  task,
  onCancel,
  onRemove,
  onRetry,
}: UploadTaskRowProps<T>) {
  const uploading = task.status === 'uploading';
  const failed = task.status === 'failed' || task.status === 'cancelled';

  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-3.5 py-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-subtle"
      >
        {task.status === 'succeeded' ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : failed ? (
          <AlertCircle className="size-4 text-danger" />
        ) : (
          <FileText className="size-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[13px] font-medium text-ink" title={task.file.name}>
            {task.file.name}
          </p>
          <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">
            {uploading ? `${task.progress}%` : formatBytes(task.file.size)}
          </span>
        </div>

        {uploading && (
          <ProgressBar
            value={task.progress}
            label={`Uploading ${task.file.name}`}
            className="mt-2"
          />
        )}

        {task.status === 'succeeded' && task.result && (
          <p className="mt-0.5 text-[12.5px] text-ink-subtle">
            {formatPageCount(task.result.file.pageCount)} · ready
          </p>
        )}

        {task.status === 'cancelled' && (
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Upload cancelled.</p>
        )}

        {task.status === 'failed' && (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-danger">{task.error}</p>
        )}

        {failed && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(task)}
            className="mt-1.5 rounded-sm text-[12.5px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Try again
          </button>
        )}
      </div>

      <IconButton
        label={uploading ? `Cancel upload of ${task.file.name}` : `Remove ${task.file.name}`}
        icon={<X />}
        size="sm"
        onClick={() => (uploading ? onCancel(task.localId) : onRemove(task.localId))}
      />
    </div>
  );
}
