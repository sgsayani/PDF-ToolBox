import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

type Variant = 'surface' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  surface:
    'bg-surface text-ink-muted border border-line-strong shadow-subtle hover:text-ink hover:bg-raised',
  ghost: 'text-ink-muted hover:bg-raised hover:text-ink',
  danger: 'bg-surface text-danger border border-line-strong shadow-subtle hover:bg-danger-soft hover:border-danger-line',
};

const SIZES: Record<Size, string> = {
  sm: 'size-7 [&>svg]:size-3.5',
  md: 'size-9 [&>svg]:size-4',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must still be announced. */
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
