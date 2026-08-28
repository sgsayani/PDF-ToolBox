import type { ReactNode } from 'react';
import { CheckCircle2, Download, FilePlus2, PenLine } from 'lucide-react';

import { formatBytes, formatPageCount } from '../../lib/format';
import { pdfApi } from '../../services/pdfApi';
import type { ApiFile } from '../../types';
import { Button, buttonStyles } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ResultDialogProps {
  result: ApiFile | null;
  /** True while the produced file is being loaded back for further editing. */
  continuing: boolean;
  onContinueEditing: () => void;
  onStartOver: () => void;
  onClose: () => void;
  /**
   * Hides "Keep editing". Defaults to `true`. A password-protected result
   * can't be reopened for editing — this app has no way to read it back
   * without asking for the password again — so that tool passes `false`.
   */
  allowContinueEditing?: boolean;
  /** Extra context shown below the file summary, e.g. a password reminder. */
  note?: ReactNode;
}

/**
 * Success state shown after an operation completes.
 *
 * The file is never downloaded automatically — the user decides, and can keep
 * working on the result instead.
 */
export function ResultDialog({
  result,
  continuing,
  onContinueEditing,
  onStartOver,
  onClose,
  allowContinueEditing = true,
  note,
}: ResultDialogProps) {
  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="Your PDF is ready"
      size="md"
      footer={
        result && (
          <>
            <Button variant="ghost" onClick={onStartOver} icon={<FilePlus2 />}>
              Start over
            </Button>
            {allowContinueEditing && (
              <Button
                variant="secondary"
                onClick={onContinueEditing}
                loading={continuing}
                icon={<PenLine />}
              >
                Keep editing
              </Button>
            )}
            {/* A real link: the browser handles the download natively, and the
                user can still open it in a new tab if they prefer. */}
            <a
              href={pdfApi.downloadUrl(result.id)}
              download={result.filename}
              className={buttonStyles('primary', 'md')}
            >
              <Download className="size-4" aria-hidden="true" />
              Download
            </a>
          </>
        )
      }
    >
      {result && (
        <div className="flex items-start gap-3 rounded-md border border-line bg-raised/50 px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink" title={result.filename}>
              {result.filename}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-subtle">
              {formatPageCount(result.pageCount)} · {formatBytes(result.size)}
            </p>
          </div>
        </div>
      )}
      {result && note && <div className="mt-3">{note}</div>}
    </Modal>
  );
}
