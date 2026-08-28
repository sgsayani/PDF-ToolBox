import { useState, type ReactNode } from 'react';
import { CheckCircle2, Download, FilePlus2, PenLine, Save } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { formatBytes, formatPageCount } from '../../lib/format';
import { accountApi } from '../../services/accountApi';
import { ApiError } from '../../services/apiClient';
import { pdfApi } from '../../services/pdfApi';
import type { ApiFile } from '../../types';
import { Button, buttonStyles } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

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
  /** Defaults to "Your PDF is ready" — override for a result that isn't a PDF. */
  title?: string;
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
  title = 'Your PDF is ready',
}: ResultDialogProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToAccount = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await accountApi.saveFile(result.id);
      setSavedId(result.id);
      toast.success('Saved', 'Find it any time in your account under Saved files.');
    } catch (error) {
      toast.error('Could not save file', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        result && (
          <>
            <Button variant="ghost" onClick={onStartOver} icon={<FilePlus2 />}>
              Start over
            </Button>
            {user && (
              <Button
                variant="secondary"
                onClick={() => void handleSaveToAccount()}
                loading={isSaving}
                disabled={savedId === result.id}
                icon={<Save />}
              >
                {savedId === result.id ? 'Saved' : 'Save to account'}
              </Button>
            )}
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
