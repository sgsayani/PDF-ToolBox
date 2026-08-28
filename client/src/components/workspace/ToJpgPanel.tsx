import { formatPageCount } from '../../lib/format';
import { findTool } from '../../lib/tools';
import { Segmented } from '../ui/Segmented';
import { ToolPanel } from './ToolPanel';

export type ToJpgApplyTo = 'all' | 'selected';

interface ToJpgPanelProps {
  applyTo: ToJpgApplyTo;
  onApplyToChange: (applyTo: ToJpgApplyTo) => void;
  totalPages: number;
  selectedCount: number;
  disabled: boolean;
}

export function ToJpgPanel({
  applyTo,
  onApplyToChange,
  totalPages,
  selectedCount,
}: ToJpgPanelProps) {
  return (
    <ToolPanel tool={findTool('to-jpg')}>
      <Segmented
        label="Pages to convert"
        value={applyTo}
        onChange={onApplyToChange}
        options={[
          { value: 'all', label: `All ${formatPageCount(totalPages)}` },
          { value: 'selected', label: 'Selected pages' },
        ]}
      />

      {applyTo === 'selected' && (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          {selectedCount === 0
            ? 'Click pages in the preview to choose which ones to export.'
            : `Will export ${formatPageCount(selectedCount)}.`}
        </p>
      )}

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Each page becomes its own JPG. Exporting more than one page also bundles them into a
          ZIP you can download in one go.
        </p>
      </div>
    </ToolPanel>
  );
}
