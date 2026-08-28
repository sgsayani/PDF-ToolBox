import { cn } from '../../lib/cn';
import { WORKSPACE_TOOL_CATEGORIES } from '../../lib/tools';
import type { WorkspaceTool } from '../../types';

interface ToolRailProps {
  active: WorkspaceTool;
  onSelect: (tool: WorkspaceTool) => void;
  disabled: boolean;
}

/**
 * The workspace's tool list.
 *
 * Planned tools are listed but rendered as inert, labelled rows — they are
 * never presented as buttons that quietly do nothing.
 */
export function ToolRail({ active, onSelect, disabled }: ToolRailProps) {
  return (
    <nav aria-label="PDF tools" className="space-y-5">
      {WORKSPACE_TOOL_CATEGORIES.map((category) => (
        <div key={category.id}>
          <h2 className="px-2 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
            {category.name}
          </h2>

          <ul className="mt-1.5 space-y-0.5">
            {category.tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = tool.tool === active;

              if (tool.status === 'planned') {
                return (
                  <li
                    key={tool.id}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink-subtle"
                  >
                    <Icon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                    <span className="truncate">{tool.name}</span>
                    <span className="ml-auto shrink-0 text-[10.5px] tracking-wide text-ink-subtle/80">
                      Soon
                    </span>
                  </li>
                );
              }

              return (
                <li key={tool.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => tool.tool && onSelect(tool.tool)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink-muted hover:bg-raised hover:text-ink',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tool.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
