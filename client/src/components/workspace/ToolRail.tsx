import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import { AVAILABLE_TOOLS, WORKSPACE_TOOL_CATEGORIES, type ToolDefinition } from '../../lib/tools';
import type { WorkspaceTool } from '../../types';

interface ToolRailProps {
  active: WorkspaceTool;
  onSelect: (tool: WorkspaceTool) => void;
  disabled: boolean;
  /** Most-recently-used tools, newest first — shown as a shortcut above the categories. */
  recent?: WorkspaceTool[];
}

function matches(tool: ToolDefinition, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
}

function ToolRow({
  tool,
  active,
  disabled,
  onSelect,
}: {
  tool: ToolDefinition;
  active: boolean;
  disabled: boolean;
  onSelect: (tool: WorkspaceTool) => void;
}) {
  const Icon = tool.icon;

  if (tool.status === 'planned') {
    return (
      <li className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink-subtle">
        <Icon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
        <span className="truncate">{tool.name}</span>
        <span className="ml-auto shrink-0 text-[10.5px] tracking-wide text-ink-subtle/80">Soon</span>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-current={active ? 'true' : undefined}
        onClick={() => tool.tool && onSelect(tool.tool)}
        title={tool.description}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-raised hover:text-ink',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{tool.name}</span>
      </button>
    </li>
  );
}

/**
 * The workspace's tool list: a search box that filters across every
 * category, a shortcut row for recently-used tools, then the full
 * categorised list. Planned tools are listed but rendered as inert,
 * labelled rows — they are never presented as buttons that quietly do
 * nothing.
 */
export function ToolRail({ active, onSelect, disabled, recent = [] }: ToolRailProps) {
  const [query, setQuery] = useState('');

  const recentTools = useMemo(
    () =>
      recent
        .map((toolId) => AVAILABLE_TOOLS.find((definition) => definition.tool === toolId))
        .filter((definition): definition is ToolDefinition => definition !== undefined),
    [recent],
  );

  const isSearching = query.trim().length > 0;

  const filteredCategories = useMemo(
    () =>
      WORKSPACE_TOOL_CATEGORIES.map((category) => ({
        ...category,
        tools: category.tools.filter((tool) => matches(tool, query)),
      })).filter((category) => category.tools.length > 0),
    [query],
  );

  return (
    <nav aria-label="PDF tools" className="space-y-5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          className="h-8.5 w-full rounded-md border border-line-strong bg-surface pl-8 pr-2.5 text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:border-accent"
        />
      </div>

      {!isSearching && recentTools.length > 0 && (
        <div>
          <h2 className="px-2 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
            Recent
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {recentTools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} active={tool.tool === active} disabled={disabled} onSelect={onSelect} />
            ))}
          </ul>
        </div>
      )}

      {filteredCategories.length === 0 ? (
        <p className="px-2 text-[13px] text-ink-subtle">No tools match &ldquo;{query}&rdquo;.</p>
      ) : (
        filteredCategories.map((category) => (
          <div key={category.id}>
            <h2 className="px-2 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
              {category.name}
            </h2>
            <ul className="mt-1.5 space-y-0.5">
              {category.tools.map((tool) => (
                <ToolRow
                  key={tool.id}
                  tool={tool}
                  active={tool.tool === active}
                  disabled={disabled}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </nav>
  );
}
