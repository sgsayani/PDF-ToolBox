import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, LogOut, User as UserIcon } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

/** Initials shown in the avatar badge, e.g. "Alice Smith" → "AS". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0] ?? '?'];
  return letters.join('').toUpperCase();
}

/**
 * Sits in the site header. Anonymous visitors see plain login/sign-up links —
 * this app has never required an account, so nothing here should suggest
 * otherwise. Signed-in users get an avatar with a small menu instead.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Defaults to the logged-out buttons while the session check (`/api/auth/me`)
  // is still in flight — on a slow or cold-started API that can take a while,
  // and a blank header for that whole time is worse than a brief flicker from
  // "Log in" to an avatar for the minority of visits that turn out to be
  // signed in.
  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/login"
          className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
        >
          Log in
        </Link>
        <Link to="/register" className="hidden sm:block">
          <Button variant="primary" size="sm">
            Sign up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent transition-opacity hover:opacity-80"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 w-52 rounded-md border border-line bg-surface py-1.5 shadow-panel"
        >
          <div className="border-b border-line px-3.5 py-2.5">
            <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[12px] text-ink-subtle">{user.email}</p>
          </div>

          <Link
            role="menuitem"
            to="/account"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-[13px] text-ink-muted transition-colors hover:bg-raised hover:text-ink',
            )}
          >
            <UserIcon className="size-3.5" aria-hidden="true" />
            Account
          </Link>
          <Link
            role="menuitem"
            to="/account?tab=history"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-ink-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <History className="size-3.5" aria-hidden="true" />
            History
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void logout().then(() => navigate('/'));
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
