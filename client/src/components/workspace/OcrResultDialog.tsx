import { AlertTriangle, Copy, Download, FileText } from 'lucide-react';

import { formatPageCount } from '../../lib/format';
import { pdfApi } from '../../services/pdfApi';
import type { OcrPageResult, OcrResponse } from '../../types';
import { Button, buttonStyles } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface OcrResultDialogProps {
  result: OcrResponse | null;
  filename: string;
  onClose: () => void;
}

/** Joins per-page text with a visible page marker, matching the extract-text viewer. */
function joinPages(pages: OcrPageResult[]): string {
  return pages
    .map((page) => `── Page ${page.pageNumber} ──\n\n${page.text || '(no text recognized on this page)'}`)
    .join('\n\n');
}

/**
 * Success state for OCR. Separate from `ResultDialog`: the result is text
 * first and a PDF only sometimes, and "keep editing" doesn't apply here —
 * the searchable PDF (when produced) is a new document, not an in-place edit.
 */
export function OcrResultDialog({ result, filename, onClose }: OcrResultDialogProps) {
  const toast = useToast();
  const fullText = result ? joinPages(result.pages) : '';

  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="Text recognized"
      size="md"
      footer={
        result && (
          <>
            <Button
              variant="secondary"
              icon={<Copy />}
              onClick={() => {
                void navigator.clipboard.writeText(fullText).then(
                  () => toast.success('Copied', 'Text copied to your clipboard.'),
                  () => toast.error('Could not copy', 'Your browser blocked clipboard access.'),
                );
              }}
            >
              Copy text
            </Button>
            <Button
              variant="secondary"
              icon={<Download />}
              onClick={() => {
                const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = window.document.createElement('a');
                anchor.href = url;
                anchor.download = `${filename.replace(/\.pdf$/i, '')}-ocr.txt`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download TXT
            </Button>
            {result.file && (
              <a
                href={pdfApi.downloadUrl(result.file.id)}
                download={result.file.filename}
                className={buttonStyles('primary', 'md')}
              >
                <FileText className="size-4" aria-hidden="true" />
                Download searchable PDF
              </a>
            )}
          </>
        )
      }
    >
      {result && (
        <div className="space-y-3">
          {result.lowQuality && (
            <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This scan looks low quality — the recognized text may contain mistakes.
            </div>
          )}
          <p className="text-[12.5px] text-ink-subtle">
            {formatPageCount(result.pages.length)} scanned · {result.meanConfidence}% average
            confidence
          </p>
          <pre className="max-h-[50vh] overflow-auto rounded-md border border-line bg-surface p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
            {fullText}
          </pre>
        </div>
      )}
    </Modal>
  );
}
