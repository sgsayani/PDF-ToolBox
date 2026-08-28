import { formatPageCount } from '../../lib/format';
import { findTool } from '../../lib/tools';
import { PAGE_NUMBER_POSITIONS, type PageNumberPosition } from '../../types';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { PositionGrid } from './PositionGrid';
import { ToolPanel } from './ToolPanel';

export interface PageNumbersFormState {
  position: PageNumberPosition;
  startNumber: number;
  applyTo: 'all' | 'selected';
}

interface PageNumbersPanelProps {
  value: PageNumbersFormState;
  onChange: (patch: Partial<PageNumbersFormState>) => void;
  totalPages: number;
  selectedCount: number;
  disabled: boolean;
}

export function PageNumbersPanel({
  value,
  onChange,
  totalPages,
  selectedCount,
  disabled,
}: PageNumbersPanelProps) {
  return (
    <ToolPanel tool={findTool('page-numbers')}>
      <PositionGrid
        label="Position"
        value={value.position}
        onChange={(position) => onChange({ position: position as PageNumberPosition })}
        allowed={PAGE_NUMBER_POSITIONS}
        disabled={disabled}
      />

      <Field
        label="Start at"
        type="number"
        min={1}
        max={100_000}
        inputMode="numeric"
        disabled={disabled}
        value={value.startNumber}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange({ startNumber: Number.isFinite(next) && next >= 1 ? Math.trunc(next) : 1 });
        }}
        hint="The first numbered page gets this number; the rest count up from there."
      />

      <Segmented
        label="Apply to"
        value={value.applyTo}
        onChange={(applyTo) => onChange({ applyTo })}
        options={[
          { value: 'all', label: `All ${formatPageCount(totalPages)}` },
          { value: 'selected', label: 'Selected pages' },
        ]}
      />

      {value.applyTo === 'selected' && (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          {selectedCount === 0
            ? 'Click pages in the preview to choose which ones get numbered.'
            : `Will number ${formatPageCount(selectedCount)}, in page order.`}
        </p>
      )}
    </ToolPanel>
  );
}
