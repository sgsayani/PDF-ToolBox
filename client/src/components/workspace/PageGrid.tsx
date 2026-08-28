import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import type { PdfPreview } from '../../lib/pdfPreview';
import type { PageDraft } from '../../types';
import { PageCard } from './PageCard';

interface PageGridProps {
  drafts: PageDraft[];
  selected: ReadonlySet<string>;
  preview: PdfPreview | null;
  disabled: boolean;
  /** Reordering is only meaningful while organising. */
  sortable: boolean;
  /** See `PageCard`. Defaults to `true`. */
  editable?: boolean;
  onReorder: (next: PageDraft[]) => void;
  onSelect: (draft: PageDraft, modifiers: { shift: boolean; toggle: boolean }) => void;
  onRotate?: (draft: PageDraft, direction: 'cw' | 'ccw') => void;
  onDelete?: (draft: PageDraft) => void;
}

export function PageGrid({
  drafts,
  selected,
  preview,
  disabled,
  sortable,
  editable = true,
  onReorder,
  onSelect,
  onRotate,
  onDelete,
}: PageGridProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const sensors = useSensors(
    // A short distance threshold keeps plain clicks (selection) working while
    // still feeling immediate once the pointer actually moves.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => setActiveKey(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveKey(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = drafts.findIndex((draft) => draft.key === active.id);
    const to = drafts.findIndex((draft) => draft.key === over.id);
    if (from === -1 || to === -1) return;

    onReorder(arrayMove(drafts, from, to));
  };

  const activeDraft = activeKey ? drafts.find((draft) => draft.key === activeKey) : undefined;
  const activeThumbnail = activeDraft ? preview?.peek(activeDraft.source) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveKey(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up page ${active.data.current?.['source'] ?? ''}.`,
          onDragOver: ({ over }) =>
            over ? 'Moved over another page. Press space to drop.' : 'No longer over a drop target.',
          onDragEnd: ({ over }) => (over ? 'Page dropped in its new position.' : 'Move cancelled.'),
          onDragCancel: () => 'Move cancelled. The page returned to its original position.',
        },
      }}
    >
      <SortableContext items={drafts.map((draft) => draft.key)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {drafts.map((draft, index) => (
            <PageCard
              key={draft.key}
              draft={draft}
              position={index + 1}
              selected={selected.has(draft.key)}
              preview={preview}
              disabled={disabled}
              sortable={sortable}
              editable={editable}
              onSelect={onSelect}
              onRotate={onRotate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeDraft && (
          <div className="rounded-md border border-accent bg-surface p-2.5 shadow-lifted">
            <div className="flex aspect-[4/5] items-center justify-center">
              {activeThumbnail ? (
                <img
                  src={activeThumbnail}
                  alt=""
                  style={{ transform: `rotate(${activeDraft.rotation}deg)` }}
                  className="max-h-full max-w-full rounded-[2px] shadow-subtle"
                />
              ) : (
                <span className="text-[11px] text-ink-subtle">Page {activeDraft.source}</span>
              )}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
