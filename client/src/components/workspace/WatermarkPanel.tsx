import { formatPageCount } from '../../lib/format';
import { findTool } from '../../lib/tools';
import type { PositionPreset } from '../../types';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { PositionGrid } from './PositionGrid';
import { ToolPanel } from './ToolPanel';

export interface WatermarkFormState {
  text: string;
  position: PositionPreset;
  /** 0–1. */
  opacity: number;
  fontSize: number;
  applyTo: 'all' | 'selected';
}

interface WatermarkPanelProps {
  value: WatermarkFormState;
  onChange: (patch: Partial<WatermarkFormState>) => void;
  totalPages: number;
  selectedCount: number;
  disabled: boolean;
}

export function WatermarkPanel({
  value,
  onChange,
  totalPages,
  selectedCount,
  disabled,
}: WatermarkPanelProps) {
  return (
    <ToolPanel tool={findTool('watermark')}>
      <Field
        label="Watermark text"
        placeholder="e.g. CONFIDENTIAL"
        maxLength={200}
        disabled={disabled}
        value={value.text}
        onChange={(event) => onChange({ text: event.target.value })}
      />

      <PositionGrid
        label="Position"
        value={value.position}
        onChange={(position) => onChange({ position })}
        disabled={disabled}
      />

      <Slider
        label="Opacity"
        value={Math.round(value.opacity * 100)}
        onChange={(percent) => onChange({ opacity: percent / 100 })}
        min={5}
        max={100}
        valueLabel={`${Math.round(value.opacity * 100)}%`}
        disabled={disabled}
      />

      <Slider
        label="Font size"
        value={value.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
        min={8}
        max={120}
        valueLabel={`${value.fontSize}px`}
        disabled={disabled}
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
            ? 'Click pages in the preview to choose where the watermark appears.'
            : `Will stamp ${formatPageCount(selectedCount)}.`}
        </p>
      )}
    </ToolPanel>
  );
}
