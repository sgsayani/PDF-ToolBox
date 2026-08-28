import { AlertTriangle, X } from 'lucide-react';

import { findTool } from '../../lib/tools';
import type { RedactionArea } from '../../types';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ToolPanel } from './ToolPanel';

interface RedactPanelProps {
  areas: RedactionArea[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
  onGoToPage: (page: number) => void;
  disabled: boolean;
}

export function RedactPanel({ areas, onRemove, onClearAll, onGoToPage, disabled }: RedactPanelProps) {
  return (
    <ToolPanel tool={findTool('redact')}>
      <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-warning">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Redaction is permanent. Any page with a redaction is rebuilt as a flattened image so the
          covered content can&rsquo;t be recovered — that page&rsquo;s text is no longer selectable.
        </span>
      </div>

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Drag on the page preview to mark an area to redact. Add as many areas, on as many pages,
          as you need.
        </p>
      </div>

      {areas.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink">
              {areas.length} area{areas.length === 1 ? '' : 's'}
            </p>
            <Button variant="ghost" size="sm" onClick={onClearAll} disabled={disabled}>
              Clear all
            </Button>
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {areas.map((area, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md border border-line bg-surface px-2.5 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => onGoToPage(area.page)}
                  className="text-[12.5px] font-medium text-ink hover:text-accent"
                >
                  Page {area.page}
                </button>
                <IconButton
                  label={`Remove redaction area ${index + 1}`}
                  icon={<X />}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolPanel>
  );
}
