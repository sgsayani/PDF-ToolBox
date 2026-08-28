import { CheckSquare, RotateCcw, RotateCw, Square, Trash2, Undo2, Redo2 } from 'lucide-react';

import { formatPageCount } from '../../lib/format';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface PageToolbarProps {
  totalPages: number;
  selectedCount: number;
  disabled: boolean;
  /** Editing controls are hidden for read-only tools such as split. */
  editable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRotateSelected: (direction: 'cw' | 'ccw') => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Controls that act on the current page selection.
 *
 * Actions that need a selection stay visible but disabled, so their existence
 * is discoverable before anything is selected.
 */
export function PageToolbar({
  totalPages,
  selectedCount,
  disabled,
  editable,
  canUndo,
  canRedo,
  onSelectAll,
  onClearSelection,
  onRotateSelected,
  onDeleteSelected,
  onUndo,
  onRedo,
}: PageToolbarProps) {
  const allSelected = selectedCount > 0 && selectedCount === totalPages;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur-sm sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || totalPages === 0}
        icon={allSelected ? <CheckSquare /> : <Square />}
        onClick={allSelected ? onClearSelection : onSelectAll}
      >
        {allSelected ? 'Clear' : 'Select all'}
      </Button>

      <span aria-live="polite" className="text-[13px] text-ink-muted">
        {hasSelection ? (
          <>
            <span className="font-medium text-ink">{selectedCount}</span> selected
          </>
        ) : (
          <span className="text-ink-subtle">{formatPageCount(totalPages)}</span>
        )}
      </span>

      {editable && (
        <>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw />}
            disabled={disabled || !hasSelection}
            onClick={() => onRotateSelected('ccw')}
          >
            Rotate left
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCw />}
            disabled={disabled || !hasSelection}
            onClick={() => onRotateSelected('cw')}
          >
            Rotate right
          </Button>
          <Button
            variant="dangerGhost"
            size="sm"
            icon={<Trash2 />}
            disabled={disabled || !hasSelection}
            onClick={onDeleteSelected}
          >
            Delete
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <IconButton
              label="Undo"
              icon={<Undo2 />}
              size="sm"
              disabled={disabled || !canUndo}
              onClick={onUndo}
            />
            <IconButton
              label="Redo"
              icon={<Redo2 />}
              size="sm"
              disabled={disabled || !canRedo}
              onClick={onRedo}
            />
          </div>
        </>
      )}
    </div>
  );
}
