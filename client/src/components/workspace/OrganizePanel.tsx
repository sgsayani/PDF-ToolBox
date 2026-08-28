import { RotateCcwSquare } from 'lucide-react';

import { findTool } from '../../lib/tools';
import { summariseChanges } from '../../lib/pages';
import type { PageDraft } from '../../types';
import { Button } from '../ui/Button';
import { ToolPanel } from './ToolPanel';

interface OrganizePanelProps {
  drafts: PageDraft[];
  originalPageCount: number;
  hasChanges: boolean;
  disabled: boolean;
  onReset: () => void;
}

export function OrganizePanel({
  drafts,
  originalPageCount,
  hasChanges,
  disabled,
  onReset,
}: OrganizePanelProps) {
  const changes = summariseChanges(drafts, originalPageCount);

  return (
    <ToolPanel tool={findTool('organize')}>
      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
          Pending changes
        </p>

        {changes.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            Drag pages to reorder them, or select pages to rotate and delete. Nothing is applied
            until you save.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-0.5">
            {changes.map((change) => (
              <li key={change} className="text-[12.5px] text-ink">
                {change}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-[12px] text-ink-subtle">
          Result: {drafts.length} of {originalPageCount} pages
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        icon={<RotateCcwSquare />}
        disabled={disabled || !hasChanges}
        onClick={onReset}
        fullWidth
      >
        Discard changes
      </Button>
    </ToolPanel>
  );
}
