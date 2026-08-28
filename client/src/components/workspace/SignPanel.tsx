import { AlertCircle } from 'lucide-react';

import { findTool } from '../../lib/tools';
import type { PositionPreset } from '../../types';
import { Slider } from '../ui/Slider';
import { PositionGrid } from './PositionGrid';
import { SignaturePad } from './SignaturePad';
import { ToolPanel } from './ToolPanel';

export interface SignFormState {
  position: PositionPreset;
  widthPercent: number;
  image: string | null;
}

interface SignPanelProps {
  value: SignFormState;
  onChange: (patch: Partial<SignFormState>) => void;
  selectedCount: number;
  disabled: boolean;
}

export function SignPanel({ value, onChange, selectedCount, disabled }: SignPanelProps) {
  return (
    <ToolPanel tool={findTool('sign')}>
      <SignaturePad
        onChange={(image) => onChange({ image })}
        disabled={disabled}
      />

      <PositionGrid
        label="Position on page"
        value={value.position}
        onChange={(position) => onChange({ position })}
        disabled={disabled}
      />

      <Slider
        label="Size"
        value={value.widthPercent}
        onChange={(widthPercent) => onChange({ widthPercent })}
        min={10}
        max={60}
        valueLabel={`${value.widthPercent}%`}
        disabled={disabled}
      />

      {selectedCount !== 1 && (
        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {selectedCount === 0
            ? 'Select the page you want to sign in the preview.'
            : 'Select exactly one page to sign.'}
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-ink-subtle">
        A basic electronic signature — your drawing is placed as an image. This isn’t a certified
        digital signature.
      </p>
    </ToolPanel>
  );
}
