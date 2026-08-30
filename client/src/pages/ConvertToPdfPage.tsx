import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, X } from 'lucide-react';

import { ResultDialog } from '../components/workspace/ResultDialog';
import { Dropzone } from '../components/upload/Dropzone';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Logo } from '../components/ui/Logo';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Seo } from '../components/seo/Seo';
import { SupportingContent } from '../components/seo/SupportingContent';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { formatBytes } from '../lib/format';
import { breadcrumbLd, faqPageLd, webApplicationLd, type FaqItem } from '../lib/structuredData';
import type { HowItWorksStep, RelatedLink } from '../lib/toolLandingContent';
import { validateFileByType } from '../lib/validateFile';
import { ApiError } from '../services/apiClient';
import type { OperationResponse } from '../types';
import type { UploadOptions } from '../services/apiClient';

interface ConvertToPdfSeo {
  /** Route this config is served at, e.g. "/excel-to-pdf". */
  path: string;
  metaDescription: string;
  howItWorks: HowItWorksStep[];
  features: string[];
  faq: FaqItem[];
  related: RelatedLink[];
}

export interface ConvertToPdfConfig {
  /** Shown in the browser-tab-ish header and page heading, e.g. "Excel to PDF". */
  title: string;
  /** One sentence under the heading, honest about what is and isn't preserved. */
  description: string;
  icon: ComponentType<{ className?: string }>;
  accept: string;
  extensions: string[];
  mimeTypes: string[];
  /** Singular/plural noun for Dropzone copy, e.g. `['Excel file', 'Excel files']`. */
  fileTypeLabel: [string, string];
  /** Noun used in validation messages, e.g. "Excel". */
  validationLabel: string;
  convert: (file: File, options: UploadOptions) => Promise<OperationResponse>;
  seo: ConvertToPdfSeo;
}

/**
 * One page behind every "Convert to PDF" source format (Excel, CSV,
 * PowerPoint, HTML, plain text) — each supplies a `ConvertToPdfConfig`
 * instead of getting its own near-duplicate page, the way Word → PDF and
 * Images → PDF each got their own (those predate this and aren't rebuilt).
 */
export function ConvertToPdfPage({ config }: { config: ConvertToPdfConfig }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { maxFileSizeBytes } = useLimits();
  const Icon = config.icon;

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof config.convert>>['file'] | null>(null);

  const convertMutation = useMutation({
    mutationFn: (toConvert: File) => config.convert(toConvert, { onProgress: setProgress }),
    onSuccess: (response) => setResult(response.file),
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : 'We could not convert this document.';
      toast.error('Conversion failed', message);
    },
  });

  const handleFiles = (files: File[]) => {
    const chosen = files[0];
    if (!chosen) return;

    const problem = validateFileByType(chosen, maxFileSizeBytes, {
      extensions: config.extensions,
      mimeTypes: config.mimeTypes,
      label: config.validationLabel,
    });
    if (problem) {
      toast.error('Could not add file', problem);
      return;
    }

    setFile(chosen);
    setProgress(0);
    convertMutation.mutate(chosen);
  };

  const startOver = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    convertMutation.reset();
  };

  const isBusy = convertMutation.isPending;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <Seo
        title={config.title}
        description={config.seo.metaDescription}
        path={config.seo.path}
        jsonLd={[
          webApplicationLd({ name: config.title, description: config.seo.metaDescription, path: config.seo.path }),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: config.title, path: config.seo.path },
          ]),
          ...(config.seo.faq.length > 0 ? [faqPageLd(config.seo.faq)] : []),
        ]}
      />
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="flex h-15 items-center gap-3 px-4 sm:px-6">
          <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => void navigate('/')}>
            <span className="hidden sm:inline">Back</span>
          </Button>
          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
          <div className="hidden shrink-0 sm:block">
            <Logo />
          </div>
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[13.5px] font-semibold text-ink">{config.title}</h1>
            <p className="truncate text-[12px] text-ink-subtle">
              {file ? file.name : 'No file added yet'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-ink">{config.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{config.description}</p>
        </div>

        {!file ? (
          <Dropzone
            accept={config.accept}
            extensions={config.extensions}
            fileTypeLabel={config.fileTypeLabel}
            maxFileSizeBytes={maxFileSizeBytes}
            onFiles={handleFiles}
          />
        ) : (
          <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-3.5 py-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-subtle"
            >
              <Icon className="size-4" />
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

              {isBusy && <ProgressBar value={progress} label={`Converting ${file.name}`} className="mt-2" />}
              {convertMutation.isError && (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-danger">
                  Conversion failed. Try again, or choose a different file.
                </p>
              )}
            </div>

            {!isBusy && (
              <IconButton label={`Remove ${file.name}`} icon={<X />} size="sm" onClick={startOver} />
            )}
          </div>
        )}

        {convertMutation.isError && !isBusy && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => file && convertMutation.mutate(file)}
          >
            Try again
          </Button>
        )}
      </main>

      <SupportingContent
        howItWorks={config.seo.howItWorks}
        features={config.seo.features}
        faq={config.seo.faq}
        related={config.seo.related}
      />

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
