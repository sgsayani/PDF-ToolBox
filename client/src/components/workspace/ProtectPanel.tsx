import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { z } from 'zod';

import { findTool } from '../../lib/tools';
import { Field } from '../ui/Field';
import { ToolPanel } from './ToolPanel';

const protectFormSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ProtectFormValues = z.infer<typeof protectFormSchema>;

interface ProtectPanelProps {
  /** Reports the password once both fields are valid and matching; `null` otherwise. */
  onPasswordReady: (password: string | null) => void;
  disabled: boolean;
}

export function ProtectPanel({ onPasswordReady, disabled }: ProtectPanelProps) {
  const {
    register,
    watch,
    formState: { errors, isValid },
  } = useForm<ProtectFormValues>({
    resolver: zodResolver(protectFormSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    onPasswordReady(isValid ? password : null);
  }, [isValid, password, onPasswordReady]);

  return (
    <ToolPanel tool={findTool('protect')}>
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        disabled={disabled}
        error={errors.password?.message}
        hint={errors.password ? undefined : 'At least 6 characters.'}
        {...register('password')}
      />

      <Field
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        disabled={disabled}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="flex items-start gap-2 rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Anyone opening this PDF will need this password. There is no way to recover it if it’s
          lost, so keep it somewhere safe.
        </p>
      </div>
    </ToolPanel>
  );
}
