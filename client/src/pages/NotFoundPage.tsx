import { Link } from 'react-router-dom';

import { buttonStyles } from '../components/ui/Button';
import { Seo } from '../components/seo/Seo';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-28 text-center">
      <Seo
        title="Page not found"
        description="This page doesn't exist."
        path="/404"
        noindex
      />
      <p className="text-[12.5px] font-semibold tracking-[0.06em] text-accent uppercase">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-ink">
        We couldn’t find that page
      </h1>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-muted">
        The link may be out of date. Head back and start with a PDF.
      </p>
      <Link to="/" className={`${buttonStyles('primary', 'md')} mt-7`}>
        Back to PDF Toolbox
      </Link>
    </div>
  );
}
