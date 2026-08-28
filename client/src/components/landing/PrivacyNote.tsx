import { Clock, ServerOff, ShieldCheck } from 'lucide-react';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Validated before processing',
    body: 'Every upload is checked on the server — file type, size and structure — not just in your browser.',
  },
  {
    icon: Clock,
    title: 'Deleted automatically',
    body: 'Files live in temporary storage under a random name and are removed on a timer, or as soon as you start over.',
  },
  {
    icon: ServerOff,
    title: 'No account, no archive',
    body: 'Documents are not kept in a database and are never stored beyond the session that created them.',
  },
];

export function PrivacyNote() {
  return (
    <section id="privacy" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8">
      <div className="max-w-2xl">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
          Your files stay yours
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">
          PDFs often contain things you would rather not leave lying around. Processing here is
          deliberately short-lived.
        </p>
      </div>

      <ul className="mt-9 grid gap-6 sm:grid-cols-3">
        {POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <li key={point.title} className="rounded-lg border border-line bg-surface p-5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-md bg-accent-soft text-accent"
              >
                <Icon className="size-4" />
              </span>
              <h3 className="mt-3.5 text-[14px] font-semibold text-ink">{point.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{point.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
