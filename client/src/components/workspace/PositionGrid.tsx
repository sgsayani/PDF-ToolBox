import { cn } from '../../lib/cn';
import { POSITION_PRESETS, type PositionPreset } from '../../types';

interface PositionGridProps {
  label: string;
  value: PositionPreset;
  onChange: (position: PositionPreset) => void;
  /** Restricts which of the 9 cells are offered. Defaults to all of them. */
  allowed?: readonly PositionPreset[];
  disabled?: boolean;
}

const CELL_LABEL: Record<PositionPreset, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  center: 'Center',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

/**
 * A 3x3 grid for choosing where a stamp lands on a page.
 *
 * Shared by watermark, page-number and signature placement — they only
 * differ in which of the 9 cells they allow.
 */
export function PositionGrid({ label, value, onChange, allowed, disabled }: PositionGridProps) {
  const allowedSet = allowed ? new Set(allowed) : null;

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium text-ink">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-3 gap-1.5 rounded-md border border-line bg-raised p-1.5"
      >
        {POSITION_PRESETS.map((position) => {
          const isAllowed = !allowedSet || allowedSet.has(position);
          const selected = position === value;

          if (!isAllowed) {
            return <span key={position} aria-hidden="true" />;
          }

          return (
            <button
              key={position}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={CELL_LABEL[position]}
              title={CELL_LABEL[position]}
              disabled={disabled}
              onClick={() => onChange(position)}
              className={cn(
                'flex h-9 items-center justify-center rounded-sm border transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-transparent bg-surface hover:border-line-strong',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', selected ? 'bg-accent' : 'bg-ink-subtle/50')}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
