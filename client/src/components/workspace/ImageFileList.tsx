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
import { GripVertical, X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import type { ImageCandidate } from '../../types';
import { IconButton } from '../ui/IconButton';

interface ImageFileListProps {
  entries: ImageCandidate[];
  disabled: boolean;
  onReorder: (next: ImageCandidate[]) => void;
  onRemove: (localId: string) => void;
}

function SortableRow({
  entry,
  index,
  disabled,
  onRemove,
}: {
  entry: ImageCandidate;
  index: number;
  disabled: boolean;
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

      <span className="size-10 shrink-0 overflow-hidden rounded-md border border-line bg-raised">
        <img src={entry.previewUrl} alt="" className="size-full object-cover" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink" title={entry.filename}>
          {entry.filename}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-subtle">{formatBytes(entry.size)}</p>
      </div>

      <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">#{index + 1}</span>

      <IconButton
        label={`Remove ${entry.filename}`}
        icon={<X />}
        size="sm"
        disabled={disabled}
        onClick={() => onRemove(entry.localId)}
      />
    </li>
  );
}

/** Ordered list of images to convert. Order in the list becomes page order. */
export function ImageFileList({ entries, disabled, onReorder, onRemove }: ImageFileListProps) {
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
              onRemove={onRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
