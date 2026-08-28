import { findTool } from '../../lib/tools';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { ToolPanel } from './ToolPanel';

export type CropApplyTo = 'current' | 'selected' | 'all';

export interface CropFormState {
  applyTo: CropApplyTo;
  selectedPages: number[];
}

interface CropPanelProps {
  value: CropFormState;
  onChange: (patch: Partial<CropFormState>) => void;
  totalPages: number;
  activePage: number;
  hasRect: boolean;
  onClearRect: () => void;
  disabled: boolean;
}

export function CropPanel({ value, onChange, totalPages, activePage, hasRect, onClearRect, disabled }: CropPanelProps) {
  const togglePage = (page: number) => {
    const next = value.selectedPages.includes(page)
      ? value.selectedPages.filter((entry) => entry !== page)
      : [...value.selectedPages, page].sort((a, b) => a - b);
    onChange({ selectedPages: next });
  };

  return (
    <ToolPanel tool={findTool('crop')}>
      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Drag on the page preview to draw the crop area, then choose which pages it applies to.
        </p>
      </div>

      {hasRect && (
        <Button variant="ghost" size="sm" onClick={onClearRect} disabled={disabled}>
          Clear crop area
        </Button>
      )}

      <Segmented
        label="Apply to"
        value={value.applyTo}
        onChange={(applyTo) => onChange({ applyTo })}
        options={[
          { value: 'current', label: `Page ${activePage}` },
          { value: 'selected', label: 'Selected' },
          { value: 'all', label: `All ${totalPages}` },
        ]}
      />

      {value.applyTo === 'selected' && (
        <div className="space-y-1.5">
          <p className="text-[12.5px] text-ink-muted">
            {value.selectedPages.length === 0
              ? 'Choose which pages to crop.'
              : `${value.selectedPages.length} page${value.selectedPages.length === 1 ? '' : 's'} selected.`}
          </p>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                disabled={disabled}
                onClick={() => togglePage(page)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md text-[12px] font-medium transition-colors',
                  value.selectedPages.includes(page)
                    ? 'bg-accent-soft text-accent'
                    : 'bg-raised text-ink-muted hover:text-ink',
                )}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </ToolPanel>
  );
}
