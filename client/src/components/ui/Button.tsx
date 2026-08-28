import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-subtle hover:bg-accent-hover active:bg-accent-hover disabled:bg-accent/40 disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line-strong shadow-subtle hover:bg-raised hover:border-line-strong active:bg-raised disabled:bg-surface disabled:text-ink-subtle',
  ghost: 'text-ink-muted hover:bg-raised hover:text-ink active:bg-raised disabled:text-ink-subtle',
  danger:
    'bg-danger text-white shadow-subtle hover:bg-danger-hover active:bg-danger-hover disabled:bg-danger/40',
  dangerGhost:
    'text-danger hover:bg-danger-soft active:bg-danger-soft disabled:text-danger/40 border border-transparent hover:border-danger-line',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
  md: 'h-9.5 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
};

/**
 * The class recipe behind `Button`, exported so an anchor can be styled
 * identically without pretending to be a button.
 */
export function buttonStyles(variant: Variant = 'secondary', size: Size = 'md'): string {
  return cn(
    'inline-flex select-none items-center justify-center rounded-md font-medium whitespace-nowrap',
    'transition-colors duration-150 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Icon rendered before the label. Hidden from assistive tech. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles(variant, size), fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <Spinner className="size-3.5" />
      ) : (
        icon && (
          <span aria-hidden="true" className="[&>svg]:size-4 shrink-0">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
});
