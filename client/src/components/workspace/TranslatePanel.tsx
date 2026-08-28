import { AlertCircle } from 'lucide-react';

import { findTool } from '../../lib/tools';
import { TRANSLATE_LANGUAGES, TRANSLATE_LANGUAGE_LABELS, type TranslateLanguage } from '../../types';
import { Select } from '../ui/Select';
import { ToolPanel } from './ToolPanel';

export interface TranslateFormState {
  targetLang: TranslateLanguage;
  /** `null` lets the server auto-detect. */
  sourceLang: TranslateLanguage | null;
}

interface TranslatePanelProps {
  value: TranslateFormState;
  onChange: (patch: Partial<TranslateFormState>) => void;
  disabled: boolean;
  /** Set once a translation attempt has come back "not configured" — sticky for the rest of this visit to the tool. */
  unavailable: boolean;
}

export function TranslatePanel({ value, onChange, disabled, unavailable }: TranslatePanelProps) {
  return (
    <ToolPanel tool={findTool('translate')}>
      {unavailable && (
        <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-warning">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Translation isn&rsquo;t set up on this server yet — it needs a DeepL API key configured
            in the environment. Ask whoever runs this deployment to add one.
          </span>
        </div>
      )}

      <Select
        label="Source language"
        disabled={disabled}
        value={value.sourceLang ?? 'auto'}
        onChange={(event) =>
          onChange({
            sourceLang: event.target.value === 'auto' ? null : (event.target.value as TranslateLanguage),
          })
        }
        options={[
          { value: 'auto', label: 'Detect automatically' },
          ...TRANSLATE_LANGUAGES.map((code) => ({ value: code, label: TRANSLATE_LANGUAGE_LABELS[code] })),
        ]}
      />

      <Select
        label="Translate to"
        disabled={disabled}
        value={value.targetLang}
        onChange={(event) => onChange({ targetLang: event.target.value as TranslateLanguage })}
        options={TRANSLATE_LANGUAGES.map((code) => ({ value: code, label: TRANSLATE_LANGUAGE_LABELS[code] }))}
      />

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Extracts and translates the document&rsquo;s text, page by page. Scanned pages are read
          with OCR automatically. The result keeps the same page count, laid out fresh — the
          original fonts and layout aren&rsquo;t reproduced.
        </p>
      </div>
    </ToolPanel>
  );
}
