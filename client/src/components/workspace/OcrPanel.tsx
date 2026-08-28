import { formatPageCount } from '../../lib/format';
import { findTool } from '../../lib/tools';
import { OCR_LANGUAGES, OCR_LANGUAGE_LABELS, type OcrLanguage } from '../../types';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { ToolPanel } from './ToolPanel';

export interface OcrFormState {
  applyTo: 'all' | 'selected';
  language: OcrLanguage;
  generateSearchablePdf: boolean;
}

interface OcrPanelProps {
  value: OcrFormState;
  onChange: (patch: Partial<OcrFormState>) => void;
  totalPages: number;
  selectedCount: number;
  disabled: boolean;
}

export function OcrPanel({ value, onChange, totalPages, selectedCount, disabled }: OcrPanelProps) {
  return (
    <ToolPanel tool={findTool('ocr')}>
      <Select
        label="Language"
        disabled={disabled}
        value={value.language}
        onChange={(event) => onChange({ language: event.target.value as OcrLanguage })}
        options={OCR_LANGUAGES.map((code) => ({ value: code, label: OCR_LANGUAGE_LABELS[code] }))}
      />

      <Segmented
        label="Pages to scan"
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
            ? 'Click pages in the preview to choose which ones to scan.'
            : `Will scan ${formatPageCount(selectedCount)}.`}
        </p>
      )}

      <Segmented
        label="Searchable PDF"
        value={value.generateSearchablePdf ? 'on' : 'off'}
        onChange={(next) => onChange({ generateSearchablePdf: next === 'on' })}
        options={[
          { value: 'on', label: 'Generate' },
          { value: 'off', label: 'Text only' },
        ]}
      />

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Recognizes text on scanned or image-based pages. Works best on clear, high-resolution
          scans — a blurry or very low-resolution page may come back with mistakes or no text at
          all.
        </p>
      </div>
    </ToolPanel>
  );
}
