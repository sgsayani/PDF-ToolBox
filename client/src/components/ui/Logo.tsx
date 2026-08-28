import { cn } from '../../lib/cn';

/** The product mark. A page outline with a fold — no external asset needed. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-7 shrink-0 rounded-[7px] text-accent"
      >
        <rect width="32" height="32" rx="7" fill="currentColor" />
        <path
          d="M10 8h7.2L23 13.6V24a1.6 1.6 0 0 1-1.6 1.6H10A1.6 1.6 0 0 1 8.4 24V9.6A1.6 1.6 0 0 1 10 8Z"
          fill="#fff"
          opacity=".94"
        />
        <path
          d="M17 8.2V13a1 1 0 0 0 1 1h4.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <rect x="11.4" y="16.4" width="8.4" height="1.7" rx=".85" fill="currentColor" />
        <rect x="11.4" y="20" width="5.6" height="1.7" rx=".85" fill="currentColor" opacity=".5" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink">PDF Toolbox</span>
    </span>
  );
}
