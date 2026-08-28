const STEPS = [
  {
    title: 'Upload',
    body: 'Drop in a PDF, or pick one from your device. We check it is a real, readable PDF before anything else happens.',
  },
  {
    title: 'Choose a tool',
    body: 'Organise pages, split out the parts you need, or merge several files — all against the same open document.',
  },
  {
    title: 'Review',
    body: 'See every page as you work. Reorder by dragging, rotate and delete, and undo anything before you commit.',
  },
  {
    title: 'Download',
    body: 'Save the result, or keep editing it. Nothing downloads until you ask for it.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
          How it works
        </h2>

        <ol className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-line bg-canvas text-[12px] font-semibold tabular-nums text-ink-muted"
              >
                {index + 1}
              </span>
              <h3 className="mt-3 text-[14.5px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
