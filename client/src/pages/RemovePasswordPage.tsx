import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileText, Lock, X } from 'lucide-react';

import { ResultDialog } from '../components/workspace/ResultDialog';
import { Dropzone } from '../components/upload/Dropzone';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { Logo } from '../components/ui/Logo';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { formatBytes } from '../lib/format';
import { validatePdfFile } from '../lib/validateFile';
import { ApiError } from '../services/apiClient';
import { pdfApi } from '../services/pdfApi';
import type { ApiFile } from '../types';

/**
 * The one PDF-first tool that can't work like the others: the normal upload
 * endpoint rejects encrypted files outright, so there's no way to get a
 * password-protected PDF into the workspace to begin with. This gets its own
 * page and its own one-request upload — the file and its password travel
 * together, and nothing is guessed or bypassed.
 */
export function RemovePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { maxFileSizeBytes } = useLimits();

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiFile | null>(null);

  const unlockMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected.');
      return pdfApi.removePassword(file, password, { onProgress: setProgress });
    },
    onSuccess: (response) => setResult(response.file),
    onError: (error: unknown) => {
      // Shown inline near the password field too (see below) — the toast
      // just makes sure a failure is never silent.
      const message =
        error instanceof ApiError ? error.message : 'We could not unlock this PDF.';
      toast.error('Unlock failed', message);
    },
  });

  const handleFiles = (files: File[]) => {
    const chosen = files[0];
    if (!chosen) return;

    const problem = validatePdfFile(chosen, maxFileSizeBytes);
    if (problem) {
      toast.error('Could not add file', problem);
      return;
    }

    setFile(chosen);
    setProgress(0);
    unlockMutation.reset();
  };

  const startOver = () => {
    setFile(null);
    setPassword('');
    setProgress(0);
    setResult(null);
    unlockMutation.reset();
  };

  const isBusy = unlockMutation.isPending;
  const inlineError =
    unlockMutation.isError && unlockMutation.error instanceof ApiError
      ? unlockMutation.error.message
      : unlockMutation.isError
        ? 'We could not unlock this PDF.'
        : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="flex h-15 items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft />}
            onClick={() => void navigate('/')}
          >
            <span className="hidden sm:inline">Back</span>
          </Button>
          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
          <div className="hidden shrink-0 sm:block">
            <Logo />
          </div>
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[13.5px] font-semibold text-ink">Remove password</h1>
            <p className="truncate text-[12px] text-ink-subtle">
              {file ? file.name : 'No file added yet'}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!file || password.length === 0 || isBusy}
            loading={isBusy}
            onClick={() => unlockMutation.mutate()}
          >
            Unlock PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-ink">Remove a PDF's password</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Add a password-protected PDF and enter its password to produce an unlocked copy. This
            only works with the correct password — it can't recover or guess one.
          </p>
        </div>

        {!file ? (
          <Dropzone maxFileSizeBytes={maxFileSizeBytes} onFiles={handleFiles} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-3.5 py-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-subtle"
              >
                <FileText className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-medium text-ink" title={file.name}>
                    {file.name}
                  </p>
                  <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">
                    {isBusy ? `${progress}%` : formatBytes(file.size)}
                  </span>
                </div>
                {isBusy && (
                  <ProgressBar value={progress} label={`Unlocking ${file.name}`} className="mt-2" />
                )}
              </div>

              {!isBusy && (
                <IconButton label={`Remove ${file.name}`} icon={<X />} size="sm" onClick={startOver} />
              )}
            </div>

            <Field
              label="Password"
              type="password"
              autoComplete="off"
              disabled={isBusy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={inlineError}
              hint={
                inlineError
                  ? undefined
                  : "The password this PDF was protected with — not a new one."
              }
            />

            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-subtle">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              The file is processed temporarily and removed automatically — nothing is kept
              afterwards.
            </p>
          </div>
        )}
      </main>

      <ResultDialog
        result={result}
        continuing={false}
        onClose={() => setResult(null)}
        onContinueEditing={() => {}}
        onStartOver={startOver}
        allowContinueEditing={false}
      />
    </div>
  );
}
