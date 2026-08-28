import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A protected page can send someone here with `state.from` set, so login
  // returns them to what they were trying to reach instead of always home.
  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      void navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="mb-6">
        <Link to="/" aria-label="PDF Toolbox home">
          <Logo />
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-subtle sm:p-7">
        <h1 className="text-[17px] font-semibold text-ink">Log in</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Welcome back.</p>

        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
          />

          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Log in
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>

      <Link to="/" className="mt-6 text-[13px] text-ink-subtle hover:text-ink-muted">
        ← Back to PDF Toolbox
      </Link>
    </div>
  );
}
