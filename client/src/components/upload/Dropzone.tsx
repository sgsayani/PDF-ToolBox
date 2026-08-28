import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FilePlus2, UploadCloud } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import { toFileArray } from '../../lib/validateFile';
import { Button } from '../ui/Button';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  maxFileSizeBytes: number;
  variant?: 'hero' | 'compact';
  className?: string;
  /** File picker filter and drag-filter extensions. Defaults to PDF. */
  accept?: string;
  extensions?: string[];
  /** Singular/plural noun used in copy, e.g. `('image', 'images')`. Defaults to PDF. */
  fileTypeLabel?: [singular: string, plural: string];
}

export function Dropzone({
  onFiles,
  multiple = false,
  disabled = false,
  maxFileSizeBytes,
  variant = 'hero',
  className,
  accept = 'application/pdf,.pdf',
  extensions = ['.pdf'],
  fileTypeLabel = ['PDF', 'PDFs'],
}: DropzoneProps) {
  const [singular, plural] = fileTypeLabel;
  const inputRef = useRef<HTMLInputElement>(null);
  // Nested elements fire dragleave; counting enter/leave keeps the state stable.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [multiple, onFiles],
  );

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    handleFiles(toFileArray(event.dataTransfer.files, extensions));
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const isHero = variant === 'hero';

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(event) => {
        if (!disabled) event.preventDefault();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'relative rounded-lg border border-dashed bg-surface text-center transition-colors duration-150',
        isHero ? 'px-6 py-12 sm:py-14' : 'px-4 py-7',
        dragging ? 'border-accent bg-accent-soft/60' : 'border-line-strong',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-accent/60',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(toFileArray(event.target.files, extensions));
          // Allows re-selecting the same file after a remove/reset.
          event.target.value = '';
        }}
      />

      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={cn(
            'flex items-center justify-center rounded-full transition-colors',
            isHero ? 'size-12' : 'size-9',
            dragging ? 'bg-accent text-white' : 'bg-accent-soft text-accent',
          )}
        >
          {isHero ? <UploadCloud className="size-5" /> : <FilePlus2 className="size-4" />}
        </span>

        <p className={cn('mt-4 font-semibold text-ink', isHero ? 'text-base' : 'text-sm')}>
          {dragging
            ? 'Drop to upload'
            : multiple
              ? `Drag and drop ${plural} here`
              : `Drag and drop ${/^[aeiou]/i.test(singular) ? 'an' : 'a'} ${singular} here`}
        </p>

        <p className="mt-1 text-[13px] text-ink-muted">
          or{' '}
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="rounded-sm font-medium text-accent underline underline-offset-2 transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:text-ink-subtle"
          >
            browse your files
          </button>
        </p>

        {isHero && (
          <Button
            variant="primary"
            size="lg"
            onClick={openPicker}
            disabled={disabled}
            className="mt-6"
          >
            Choose {multiple ? plural : `${/^[aeiou]/i.test(singular) ? 'an' : 'a'} ${singular}`}
          </Button>
        )}

        <p className={cn('text-[12.5px] text-ink-subtle', isHero ? 'mt-5' : 'mt-2.5')}>
          {singular} only · up to {formatBytes(maxFileSizeBytes)}
          {multiple ? ' per file' : ''}
        </p>
      </div>
    </div>
  );
}
