import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'value' | 'onChange'> {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Rendered next to the label, e.g. `"30%"` or `"48px"`. */
  valueLabel: string;
}

/** A labelled range input, styled to match `Field`. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { label, value, onChange, min, max, step = 1, valueLabel, className, disabled, ...props },
  ref,
) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="text-[12.5px] tabular-nums text-ink-subtle">{valueLabel}</span>
      </div>
      <input
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
});
