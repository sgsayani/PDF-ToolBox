import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Logo } from '../components/ui/Logo';
import { Seo } from '../components/seo/Seo';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/apiClient';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      void navigate('/account', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <Seo
        title="Create an account"
        description="Create a PDF Toolbox account to save files and track usage."
        path="/register"
        noindex
      />
      <div className="mb-6">
        <Link to="/" aria-label="PDF Toolbox home">
          <Logo />
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-subtle sm:p-7">
        <h1 className="text-[17px] font-semibold text-ink">Create an account</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Free — save files, track history, no card required.
        </p>

        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Field
            label="Name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldErrors.name}
          />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            hint={fieldErrors.password ? undefined : 'At least 8 characters.'}
          />

          {error && !Object.keys(fieldErrors).length && (
            <p className="text-[12.5px] text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>

      <Link to="/" className="mt-6 text-[13px] text-ink-subtle hover:text-ink-muted">
        ← Back to PDF Toolbox
      </Link>
    </div>
  );
}
