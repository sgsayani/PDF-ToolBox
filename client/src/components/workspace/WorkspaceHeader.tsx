import { ArrowLeft } from 'lucide-react';

import { formatBytes, formatPageCount } from '../../lib/format';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

interface WorkspaceHeaderProps {
  filename: string;
  pageCount: number;
  size: number;
  /** Label and handler for the tool's commit action. */
  primaryLabel: string;
  primaryDisabled: boolean;
  primaryLoading: boolean;
  onPrimary: () => void;
  onExit: () => void;
}

export function WorkspaceHeader({
  filename,
  pageCount,
  size,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  onPrimary,
  onExit,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="flex h-15 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onExit}>
          <span className="hidden sm:inline">Back</span>
        </Button>

        <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />

        <div className="hidden shrink-0 sm:block">
          <Logo className="[&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        </div>

        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[13.5px] font-semibold text-ink" title={filename}>
            {filename}
          </h1>
          <p className="truncate text-[12px] text-ink-subtle">
            {formatPageCount(pageCount)} · {formatBytes(size)}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={onPrimary}
          disabled={primaryDisabled}
          loading={primaryLoading}
        >
          {primaryLabel}
        </Button>
      </div>
    </header>
  );
}
