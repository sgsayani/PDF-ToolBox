import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';

import type { FaqItem } from '../../lib/structuredData';
import type { HowItWorksStep, RelatedLink } from '../../lib/toolLandingContent';

interface SupportingContentProps {
  howItWorks: HowItWorksStep[];
  features: string[];
  faq: FaqItem[];
  related: RelatedLink[];
}

/**
 * The content that goes *below* a tool: how it works, what it does, genuine
 * FAQ, and a few related tools. Shared by the tool-specific landing pages
 * (ToolLandingPage) and the standalone conversion pages that predate them
 * (WordToPdfPage, ImagesToPdfPage, RemovePasswordPage, ConvertToPdfPage) so
 * every public tool page gets the same supporting structure once, not four
 * copies of it.
 */
export function SupportingContent({ howItWorks, features, faq, related }: SupportingContentProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <section className="border-t border-line py-10">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">How it works</h2>
        <ol className="mt-6 space-y-5">
          {howItWorks.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[11.5px] font-semibold tabular-nums text-ink-muted"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line py-10">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Key features</h2>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-[13px] leading-relaxed text-ink-muted">{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      {faq.length > 0 && (
        <section className="border-t border-line py-10">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Frequently asked questions
          </h2>
          <dl className="mt-5 space-y-5">
            {faq.map((item) => (
              <div key={item.question}>
                <dt className="text-[13.5px] font-semibold text-ink">{item.question}</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-line py-10">
          <h2 className="text-[13.5px] font-semibold text-ink">Related tools</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="inline-flex items-center rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-raised"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
