import type { ReactNode } from 'react';

import type { ToolDefinition } from '../../lib/tools';

/** Shared shell for the options panel of whichever tool is active. */
export function ToolPanel({
  tool,
  children,
}: {
  tool: ToolDefinition;
  children?: ReactNode;
}) {
  const Icon = tool.icon;

  return (
    <section aria-label={`${tool.name} options`} className="space-y-3">
      {/* Redundant on narrow screens, where the tool switcher above already
          names the active tool — and vertical space there is precious. */}
      <div className="hidden items-start gap-2.5 lg:flex">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
        >
          <Icon className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[13.5px] font-semibold text-ink">{tool.name}</h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{tool.description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
