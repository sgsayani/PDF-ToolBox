import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical, X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatBytes, formatPageCount } from '../../lib/format';
import type { MergeCandidate } from '../../types';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';

interface MergeFileListProps {
  entries: MergeCandidate[];
  disabled: boolean;
  onReorder: (next: MergeCandidate[]) => void;
  onRemove: (localId: string) => void;
  /** The document open in the workspace — always part of the merge. */
  pinnedId: string;
}

function SortableRow({
  entry,
  index,
  disabled,
  pinned,
  onRemove,
}: {
  entry: MergeCandidate;
  index: number;
  disabled: boolean;
  pinned: boolean;
  onRemove: (localId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.localId,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-surface px-3 py-2.5',
        isDragging ? 'z-10 border-accent shadow-lifted' : 'border-line',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Reorder ${entry.filename}`}
        className="cursor-grab rounded text-ink-subtle transition-colors hover:text-ink active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-subtle"
      >
        <FileText className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-ink" title={entry.filename}>
            {entry.filename}
          </p>
          {pinned && <Badge tone="accent">Currently open</Badge>}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-subtle">
          {formatPageCount(entry.pageCount)} · {formatBytes(entry.size)}
        </p>
      </div>

      <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">#{index + 1}</span>

      {!pinned && (
        <IconButton
          label={`Remove ${entry.filename}`}
          icon={<X />}
          size="sm"
          disabled={disabled}
          onClick={() => onRemove(entry.localId)}
        />
      )}
    </li>
  );
}

/** Ordered list of files to merge. Order in the list is order in the output. */
export function MergeFileList({
  entries,
  disabled,
  onReorder,
  onRemove,
  pinnedId,
}: MergeFileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = entries.findIndex((entry) => entry.localId === active.id);
    const to = entries.findIndex((entry) => entry.localId === over.id);
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(entries, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={entries.map((entry) => entry.localId)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <SortableRow
              key={entry.localId}
              entry={entry}
              index={index}
              disabled={disabled}
              pinned={entry.localId === pinnedId}
              onRemove={onRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
