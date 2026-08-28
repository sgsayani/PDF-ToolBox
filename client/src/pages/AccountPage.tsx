import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Download,
  FileX2,
  History as HistoryIcon,
  LogOut,
  Save,
  Trash2,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { Logo } from '../components/ui/Logo';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { formatBytes, formatDateTime, formatPageCount } from '../lib/format';
import { accountApi } from '../services/accountApi';
import { ApiError } from '../services/apiClient';

type Tab = 'profile' | 'history' | 'saved';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'profile', label: 'Profile & usage' },
  { value: 'history', label: 'History' },
  { value: 'saved', label: 'Saved files' },
];

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab | null) ?? 'profile';

  if (!user) return null; // RequireAuth guarantees this never renders anonymously.

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="PDF Toolbox home" className="shrink-0">
            <Logo />
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-line" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[13.5px] font-semibold text-ink">Account</h1>
            <p className="truncate text-[12px] text-ink-subtle">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut />}
            onClick={() => {
              // Navigate off this protected route *before* the session
              // clears — otherwise `RequireAuth` notices the now-signed-out
              // state while still mounted here and redirects to /login
              // instead, which reads as "you got logged out," not the
              // intentional "you logged out" this button means.
              void navigate('/');
              void logout();
            }}
          >
            <span className="hidden sm:inline">Log out</span>
          </Button>
          <Link to="/">
            <Button variant="ghost" size="sm" icon={<ArrowLeft />}>
              <span className="hidden sm:inline">Back to tools</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="max-w-sm">
          <Segmented
            label="Account section"
            value={tab}
            onChange={(next) => setSearchParams(next === 'profile' ? {} : { tab: next })}
            options={TAB_OPTIONS}
          />
        </div>

        <div className="mt-6">
          {tab === 'profile' ? <ProfileAndUsage /> : tab === 'history' ? <HistoryTab /> : <SavedFilesTab />}
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------- Profile

function ProfileAndUsage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const usageQuery = useQuery({ queryKey: ['account', 'usage'], queryFn: () => accountApi.usage() });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated', 'Your name has been saved.');
    } catch (error) {
      toast.error('Could not update profile', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Profile</h2>
        <form className="mt-4 max-w-xs space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Field label="Email" value={user?.email ?? ''} disabled hint="Email can't be changed yet." />
          <Button type="submit" variant="primary" loading={isSaving} disabled={name.trim().length === 0}>
            Save changes
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Usage</h2>
        {usageQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : usageQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone="accent">{usageQuery.data.plan === 'free' ? 'Free plan' : usageQuery.data.plan}</Badge>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-ink-muted">Processing today</span>
                <span className="font-medium text-ink tabular-nums">
                  {usageQuery.data.usage.processedToday} / {usageQuery.data.limits.maxProcessingPerDay}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(
                      100,
                      (usageQuery.data.usage.processedToday / usageQuery.data.limits.maxProcessingPerDay) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[12px] text-ink-subtle">Resets daily at midnight UTC.</p>
            </div>

            <p className="text-[13px] text-ink-muted">
              Up to <span className="font-medium text-ink">{usageQuery.data.limits.maxFileSizeMb} MB</span> per
              file.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-ink-muted">Usage information isn't available right now.</p>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------- History

function HistoryTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);
  const historyQuery = useQuery({ queryKey: ['account', 'history'], queryFn: () => accountApi.history() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountApi.deleteHistoryEntry(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['account', 'history'] }),
    onError: (error: unknown) =>
      toast.error('Could not delete entry', error instanceof ApiError ? error.message : 'Please try again.'),
  });

  const clearMutation = useMutation({
    mutationFn: () => accountApi.clearHistory(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account', 'history'] });
      setConfirmClear(false);
      toast.success('History cleared', 'Your processing history has been removed.');
    },
    onError: (error: unknown) =>
      toast.error('Could not clear history', error instanceof ApiError ? error.message : 'Please try again.'),
  });

  if (historyQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const jobs = historyQuery.data?.jobs ?? [];

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon />}
        title="No processing history yet"
        description="Every PDF operation you run while signed in shows up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="dangerGhost" size="sm" icon={<Trash2 />} onClick={() => setConfirmClear(true)}>
          Clear all
        </Button>
      </div>

      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex items-start justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-medium text-ink capitalize">{job.operation.replace(/-/g, ' ')}</p>
                <Badge tone={job.status === 'succeeded' ? 'success' : 'danger'}>{job.status}</Badge>
              </div>
              <p className="mt-1 truncate text-[12.5px] text-ink-muted">
                {job.inputs.map((input) => input.filename).join(', ') || '—'}
                {job.output && <> → {job.output.filename}</>}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-subtle">
                <Clock className="size-3" aria-hidden="true" />
                {formatDateTime(job.createdAt)}
              </p>
            </div>
            <IconButton
              label={`Delete ${job.operation} entry`}
              icon={<Trash2 />}
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate(job.id)}
            />
          </li>
        ))}
      </ul>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear your entire history?"
        description="This removes every entry below. It doesn't affect any files you've saved."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
              Clear history
            </Button>
          </>
        }
      />
    </div>
  );
}

// ------------------------------------------------------------- Saved files

function SavedFilesTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const savedQuery = useQuery({ queryKey: ['account', 'saved-files'], queryFn: () => accountApi.savedFiles() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountApi.deleteSavedFile(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account', 'saved-files'] });
      setPendingDelete(null);
    },
    onError: (error: unknown) =>
      toast.error('Could not delete file', error instanceof ApiError ? error.message : 'Please try again.'),
  });

  if (savedQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const files = savedQuery.data?.files ?? [];

  if (files.length === 0) {
    return (
      <EmptyState
        icon={<Save />}
        title="No saved files yet"
        description={'After processing a PDF, choose "Save to account" in the result dialog to keep it here.'}
      />
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink" title={file.filename}>
                {file.filename}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-subtle">
                {formatPageCount(file.pageCount)} · {formatBytes(file.size)} · {formatDateTime(file.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={accountApi.savedFileDownloadUrl(file.id)}
                download={file.filename}
                className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                aria-label={`Download ${file.filename}`}
                title="Download"
              >
                <Download className="size-4" aria-hidden="true" />
              </a>
              <IconButton
                label={`Delete ${file.filename}`}
                icon={<Trash2 />}
                size="sm"
                variant="ghost"
                onClick={() => setPendingDelete(file.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this file?"
        description="This permanently removes the saved copy. It can't be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<FileX2 />}
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
