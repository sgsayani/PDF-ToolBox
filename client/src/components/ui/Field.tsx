import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

/** A labelled text input wired up for screen readers and validation messages. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, className, ...props },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && hintId, error && errorId) || undefined}
        className={cn(
          'h-9.5 w-full rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle',
          'transition-colors focus:outline-none focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-subtle',
          error ? 'border-danger-line' : 'border-line-strong',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-[12.5px] leading-relaxed text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
