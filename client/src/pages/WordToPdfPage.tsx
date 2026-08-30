import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileText, X } from 'lucide-react';

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
import { breadcrumbLd, faqPageLd, webApplicationLd } from '../lib/structuredData';
import { validateDocxFile } from '../lib/validateFile';
import { ApiError } from '../services/apiClient';
import { documentsApi } from '../services/documentsApi';
import type { ApiFile } from '../types';

const META_DESCRIPTION =
  'Convert a Word document (.docx) to PDF online. Text is preserved and reflowed onto A4 pages. Free, no sign-up required.';

const HOW_IT_WORKS = [
  { title: 'Upload your Word document', body: 'Add a .docx file — it’s checked before conversion starts.' },
  {
    title: 'Convert',
    body: 'The document’s text is read and reflowed onto standard A4 pages with word-wrapping.',
  },
  { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
];

const FEATURES = [
  'Converts .docx text content to PDF',
  'Reflows onto standard A4 pages automatically',
  'No account needed — convert and download directly',
];

const FAQ = [
  {
    question: 'Will fonts, tables and images be preserved?',
    answer:
      'No — this reads the document’s text and reflows it onto a PDF page with a standard font. Original fonts, tables, images and page layout aren’t reproduced.',
  },
  {
    question: 'What file types can I upload?',
    answer: 'A .docx file (the modern Word format). Older .doc files aren’t supported.',
  },
];

const RELATED = [
  { label: 'PDF to Word', href: '/pdf-to-word' },
  { label: 'Excel to PDF', href: '/excel-to-pdf' },
  { label: 'PowerPoint to PDF', href: '/powerpoint-to-pdf' },
];

/**
 * The reverse of PDF → Word: builds a PDF from a Word document, so — like
 * Images → PDF — it has no open PDF to run a workspace panel against and
 * gets its own page instead.
 */
export function WordToPdfPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { maxFileSizeBytes } = useLimits();

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiFile | null>(null);

  const convertMutation = useMutation({
    mutationFn: (toConvert: File) =>
      documentsApi.toPdf(toConvert, { onProgress: setProgress }),
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

    const problem = validateDocxFile(chosen, maxFileSizeBytes);
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
        title="Convert Word to PDF"
        description={META_DESCRIPTION}
        path="/word-to-pdf"
        jsonLd={[
          webApplicationLd({ name: 'Word to PDF', description: META_DESCRIPTION, path: '/word-to-pdf' }),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Word to PDF', path: '/word-to-pdf' },
          ]),
          faqPageLd(FAQ),
        ]}
      />
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
            <h1 className="truncate text-[13.5px] font-semibold text-ink">Word to PDF</h1>
            <p className="truncate text-[12px] text-ink-subtle">
              {file ? file.name : 'No document added yet'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-ink">Convert a Word document to PDF</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Add a .docx file to convert it right away. Text is preserved; original fonts, tables
            and images aren't.
          </p>
        </div>

        {!file ? (
          <Dropzone
            accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
            extensions={['.docx']}
            fileTypeLabel={['Word document', 'Word documents']}
            maxFileSizeBytes={maxFileSizeBytes}
            onFiles={handleFiles}
          />
        ) : (
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
                <ProgressBar value={progress} label={`Converting ${file.name}`} className="mt-2" />
              )}
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
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => file && convertMutation.mutate(file)}>
            Try again
          </Button>
        )}
      </main>

      <SupportingContent howItWorks={HOW_IT_WORKS} features={FEATURES} faq={FAQ} related={RELATED} />

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
