import { Link, Outlet } from 'react-router-dom';

import { UserMenu } from '../components/auth/UserMenu';
import { Logo } from '../components/ui/Logo';

const NAV_LINKS = [
  { href: '#tools', label: 'Tools' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
];

/** Chrome for the public pages. The workspace deliberately uses its own shell. */
export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only-focusable absolute top-3 left-3 z-50 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link to="/" className="rounded-md" aria-label="PDF Toolbox home">
            <Logo />
          </Link>

          <div className="flex items-center gap-4">
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              Everything you need to work with PDFs, in one place. Files are processed on demand and
              removed automatically.
            </p>
          </div>

          <nav aria-label="Footer" className="flex gap-10">
            <div>
              <h2 className="text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
                Product
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="rounded-sm text-[13px] text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-5 py-4 text-[12.5px] text-ink-subtle sm:px-8">
            © {new Date().getFullYear()} PDF Toolbox
          </p>
        </div>
      </footer>
    </div>
  );
}
