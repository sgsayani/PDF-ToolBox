import type { CSSProperties } from 'react';

import { useThumbnail } from '../../hooks/usePdfPreview';
import { formatPageCount } from '../../lib/format';
import type { PdfPreview } from '../../lib/pdfPreview';
import { findTool } from '../../lib/tools';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { ToolPanel } from './ToolPanel';

export interface CleanupFormState {
  applyTo: 'all' | 'selected';
  grayscale: boolean;
  brightness: number;
  contrast: number;
  rotate: number;
  denoise: boolean;
  cleanBackground: boolean;
}

interface ScannerCleanupPanelProps {
  value: CleanupFormState;
  onChange: (patch: Partial<CleanupFormState>) => void;
  totalPages: number;
  selectedCount: number;
  /** First selected page, or the document's first page, for the live preview. */
  previewPageNumber: number;
  preview: PdfPreview | null;
  disabled: boolean;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Segmented
      label={label}
      value={checked ? 'on' : 'off'}
      onChange={(next) => onChange(next === 'on')}
      options={[
        { value: 'off', label: 'Off' },
        { value: 'on', label: 'On' },
      ]}
    />
  );
}

export function ScannerCleanupPanel({
  value,
  onChange,
  totalPages,
  selectedCount,
  previewPageNumber,
  preview,
  disabled,
}: ScannerCleanupPanelProps) {
  const { src } = useThumbnail(preview, previewPageNumber, true);

  // Approximates grayscale/contrast/brightness/straighten with CSS; noise
  // reduction and background cleanup have no cheap CSS equivalent, so they
  // only show up in the actual processed result.
  const previewStyle: CSSProperties = {
    filter: [
      value.grayscale ? 'grayscale(1)' : '',
      `contrast(${1 + value.contrast / 100})`,
      `brightness(${1 + value.brightness / 100})`,
    ]
      .filter(Boolean)
      .join(' '),
    transform: value.rotate !== 0 ? `rotate(${value.rotate}deg)` : undefined,
  };

  return (
    <ToolPanel tool={findTool('scanner-cleanup')}>
      {src && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-ink">Preview</p>
          <div className="flex items-center justify-center overflow-hidden rounded-md border border-line bg-raised/50 p-3">
            <img src={src} alt="Cleanup preview" className="max-h-36 w-auto" style={previewStyle} />
          </div>
          <p className="text-[11.5px] leading-relaxed text-ink-subtle">
            Approximate — noise reduction and background cleanup only show up in the downloaded
            result.
          </p>
        </div>
      )}

      <Toggle label="Grayscale" checked={value.grayscale} onChange={(grayscale) => onChange({ grayscale })} />

      <Slider
        label="Brightness"
        value={value.brightness}
        onChange={(brightness) => onChange({ brightness })}
        min={-100}
        max={100}
        valueLabel={value.brightness > 0 ? `+${value.brightness}` : `${value.brightness}`}
        disabled={disabled}
      />

      <Slider
        label="Contrast"
        value={value.contrast}
        onChange={(contrast) => onChange({ contrast })}
        min={-100}
        max={100}
        valueLabel={value.contrast > 0 ? `+${value.contrast}` : `${value.contrast}`}
        disabled={disabled}
      />

      <Slider
        label="Straighten"
        value={value.rotate}
        onChange={(rotate) => onChange({ rotate })}
        min={-15}
        max={15}
        step={0.5}
        valueLabel={`${value.rotate}°`}
        disabled={disabled}
      />

      <Toggle label="Reduce noise" checked={value.denoise} onChange={(denoise) => onChange({ denoise })} />
      <Toggle
        label="Clean background"
        checked={value.cleanBackground}
        onChange={(cleanBackground) => onChange({ cleanBackground })}
      />

      <Segmented
        label="Pages to clean"
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
            ? 'Click pages in the preview to choose which ones to clean.'
            : `Will clean ${formatPageCount(selectedCount)}.`}
        </p>
      )}
    </ToolPanel>
  );
}
