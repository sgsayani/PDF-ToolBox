import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  options: SelectOption[];
}

/** A labelled dropdown, styled to match `Field`. For a handful of options, prefer `Segmented`. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, options, className, ...props },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          'h-9.5 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink',
          'transition-colors focus:outline-none focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-subtle',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="text-[12.5px] leading-relaxed text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
});
