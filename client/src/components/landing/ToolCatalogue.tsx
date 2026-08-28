import { Link } from 'react-router-dom';

import { TOOL_CATEGORIES } from '../../lib/tools';
import { cn } from '../../lib/cn';

/**
 * The full catalogue, with each tool's real status.
 *
 * Showing what is coming is useful; pretending it already works is not — so
 * planned tools are visibly marked and are not links.
 */
export function ToolCatalogue() {
  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8">
      <div className="max-w-2xl">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
          One workspace, every PDF task
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">
          Upload once and keep working. Organising, splitting and merging are available today; the
          rest are on the way.
        </p>
      </div>

      <div className="mt-9 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_CATEGORIES.map((category) => (
          <div key={category.id}>
            <h3 className="text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
              {category.name}
            </h3>

            <ul className="mt-3 space-y-2.5">
              {category.tools.map((tool) => {
                const Icon = tool.icon;
                const available = tool.status === 'available';
                const icon = (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-px flex size-6 shrink-0 items-center justify-center rounded-md',
                      available ? 'bg-accent-soft text-accent' : 'bg-raised text-ink-subtle',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                );
                const text = (
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                      {tool.name}
                      {!available && (
                        <span className="text-[10.5px] font-medium tracking-wide text-ink-subtle">
                          Soon
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                      {tool.description}
                    </p>
                  </div>
                );

                // Most tools only make sense once a PDF is already open, so
                // they're informational here. A tool with its own `href`
                // (Images to PDF) doesn't need one first — it's a real link.
                if (tool.href) {
                  return (
                    <li key={tool.id}>
                      <Link
                        to={tool.href}
                        className="-m-1 flex items-start gap-2.5 rounded-md p-1 transition-colors hover:bg-raised"
                      >
                        {icon}
                        {text}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={tool.id} className="flex items-start gap-2.5">
                    {icon}
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
