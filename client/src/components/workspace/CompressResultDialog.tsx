import { Download } from 'lucide-react';

import { formatBytes } from '../../lib/format';
import { pdfApi } from '../../services/pdfApi';
import type { CompressResponse } from '../../types';
import { buttonStyles } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface CompressResultDialogProps {
  result: CompressResponse | null;
  onClose: () => void;
}

export function CompressResultDialog({ result, onClose }: CompressResultDialogProps) {
  const reduction =
    result && result.originalSize > 0
      ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
      : 0;

  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title={result?.reduced ? 'File compressed' : 'No further reduction possible'}
      footer={
        result && (
          <a
            href={pdfApi.downloadUrl(result.file.id)}
            download={result.file.filename}
            className={buttonStyles('primary', 'md')}
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </a>
        )
      }
    >
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3.5 py-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
                Original
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink">{formatBytes(result.originalSize)}</p>
            </div>
            <div className="text-ink-subtle">→</div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
                Result
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink">{formatBytes(result.compressedSize)}</p>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            {result.reduced
              ? `About ${reduction}% smaller.`
              : "This file was already compact — compressing it further didn't reduce its size, so this is the original file, re-saved."}
          </p>
        </div>
      )}
    </Modal>
  );
}
