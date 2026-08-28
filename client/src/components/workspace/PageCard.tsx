import { memo, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImageOff, RotateCcw, RotateCw, Trash2 } from 'lucide-react';

import { useInView } from '../../hooks/useInView';
import { useThumbnail } from '../../hooks/usePdfPreview';
import type { PdfPreview } from '../../lib/pdfPreview';
import { cn } from '../../lib/cn';
import type { PageDraft } from '../../types';
import { Skeleton } from '../ui/Skeleton';

interface PageCardProps {
  draft: PageDraft;
  /** 1-based position in the current plan. */
  position: number;
  selected: boolean;
  preview: PdfPreview | null;
  disabled: boolean;
  sortable: boolean;
  /**
   * Whether the per-card rotate/delete affordances are offered at all.
   * Defaults to `true` — tools that only need page *selection* (watermark,
   * page numbers, signature placement) pass `false` so hovering a card can't
   * imply an edit capability the tool doesn't act on.
   */
  editable?: boolean;
  onSelect: (draft: PageDraft, modifiers: { shift: boolean; toggle: boolean }) => void;
  onRotate?: (draft: PageDraft, direction: 'cw' | 'ccw') => void;
  onDelete?: (draft: PageDraft) => void;
}

/** Stops a pointer interaction from being interpreted as the start of a drag. */
function swallowDrag(event: ReactPointerEvent) {
  event.stopPropagation();
}

function PageCardComponent({
  draft,
  position,
  selected,
  preview,
  disabled,
  sortable,
  editable = true,
  onSelect,
  onRotate,
  onDelete,
}: PageCardProps) {
  const { setRef: setInViewRef, inView } = useInView<HTMLLIElement>();
  const { src, failed } = useThumbnail(preview, draft.source, inView);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draft.key,
    disabled: disabled || !sortable,
  });

  // Stable across renders: an inline ref callback would make React detach and
  // re-attach the node on every render, restarting the observer each time.
  const setRefs = useCallback(
    (node: HTMLLIElement | null) => {
      setNodeRef(node);
      setInViewRef(node);
    },
    [setNodeRef, setInViewRef],
  );

  const rotation = ((draft.rotation % 360) + 360) % 360;
  const quarterTurned = rotation === 90 || rotation === 270;

  return (
    <li
      ref={setRefs}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(sortable ? listeners : {})}
      className={cn(
        'group relative touch-manipulation',
        isDragging && 'z-20 opacity-40',
        sortable && !disabled && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div
        className={cn(
          'relative rounded-md border bg-surface transition-[border-color,box-shadow] duration-150',
          selected
            ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]'
            : 'border-line hover:border-line-strong hover:shadow-card',
          disabled && 'opacity-60',
        )}
      >
        {/* A 4:5 frame suits upright pages. A quarter-turned page is bounded by
            the frame's *other* axis instead: 80% of the height equals the width,
            and 125% of the width equals the height. */}
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-t-md bg-raised/50 p-2.5">
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{ transform: `rotate(${rotation}deg)` }}
              className={cn(
                'rounded-[2px] shadow-subtle transition-transform duration-200',
                quarterTurned ? 'max-h-[80%] max-w-[125%]' : 'max-h-full max-w-full',
              )}
            />
          ) : failed ? (
            <span className="flex flex-col items-center gap-1.5 text-ink-subtle">
              <ImageOff className="size-4" aria-hidden="true" />
              <span className="text-[11px]">No preview</span>
            </span>
          ) : (
            <Skeleton className="h-full w-[74%]" />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-2.5 py-1.5">
          <label
            className={cn(
              // Generous padding so the checkbox itself is not the tap target.
              '-my-1 flex min-w-0 items-center gap-2 py-1',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            onPointerDown={swallowDrag}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={disabled}
              onChange={() => onSelect(draft, { shift: false, toggle: true })}
              onClick={(event) => {
                if (event.shiftKey) {
                  event.preventDefault();
                  onSelect(draft, { shift: true, toggle: false });
                }
              }}
              className="size-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              aria-label={`Select page ${draft.source}`}
            />
            <span className="truncate text-[11.5px] font-medium tabular-nums text-ink-muted">
              {position}
              {draft.source !== position && (
                <span className="ml-1 text-ink-subtle">· was {draft.source}</span>
              )}
            </span>
          </label>

          {rotation !== 0 && (
            <span className="shrink-0 text-[10.5px] font-medium tabular-nums text-accent">
              {rotation}°
            </span>
          )}
        </div>

        {/* Hover / focus actions for pointer devices. Hidden on touch layouts,
            where there is no hover: those users select pages and use the
            toolbar, whose controls are full-sized. */}
        {(sortable || editable) && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 hidden items-start justify-between gap-1 p-1.5 sm:flex',
              'opacity-0 transition-opacity duration-150',
              'group-hover:opacity-100 group-focus-within:opacity-100',
            )}
          >
            {sortable ? (
              <button
                type="button"
                {...attributes}
                {...listeners}
                disabled={disabled}
                aria-label={`Reorder page ${draft.source}`}
                onPointerDown={(event) => event.stopPropagation()}
                className="pointer-events-auto rounded bg-surface/95 p-1.5 text-ink-subtle shadow-subtle ring-1 ring-line hover:text-ink"
              >
                <GripVertical className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <span />
            )}

            {editable && (
              <span className="pointer-events-auto flex gap-1" onPointerDown={swallowDrag}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRotate?.(draft, 'ccw')}
                  aria-label={`Rotate page ${draft.source} counter-clockwise`}
                  className="rounded bg-surface/95 p-1.5 text-ink-subtle shadow-subtle ring-1 ring-line transition-colors hover:text-ink disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRotate?.(draft, 'cw')}
                  aria-label={`Rotate page ${draft.source} clockwise`}
                  className="rounded bg-surface/95 p-1.5 text-ink-subtle shadow-subtle ring-1 ring-line transition-colors hover:text-ink disabled:opacity-40"
                >
                  <RotateCw className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDelete?.(draft)}
                  aria-label={`Delete page ${draft.source}`}
                  className="rounded bg-surface/95 p-1.5 text-ink-subtle shadow-subtle ring-1 ring-line transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Memoised: reordering a long document re-renders the list, but each card's
 * props are unchanged unless that specific page moved, was selected or rotated.
 */
export const PageCard = memo(PageCardComponent);
