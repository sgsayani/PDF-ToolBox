import { Download, FileArchive, FilePlus2 } from 'lucide-react';

import { formatBytes } from '../../lib/format';
import { pdfApi } from '../../services/pdfApi';
import type { ImageExportResponse } from '../../types';
import { Button, buttonStyles } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ImageResultDialogProps {
  result: ImageExportResponse | null;
  onClose: () => void;
  onStartOver: () => void;
}

/**
 * Success state for PDF → JPG. Separate from `ResultDialog`: this operation
 * can produce several files plus an optional ZIP, which no single-file
 * result shape covers, and "keep editing" doesn't apply to loose JPGs.
 */
export function ImageResultDialog({ result, onClose, onStartOver }: ImageResultDialogProps) {
  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title={result && result.files.length > 1 ? 'Your JPGs are ready' : 'Your JPG is ready'}
      size="md"
      footer={
        result && (
          <>
            <Button variant="ghost" onClick={onStartOver} icon={<FilePlus2 />}>
              Start over
            </Button>
            {result.zip && (
              <a
                href={pdfApi.downloadUrl(result.zip.id)}
                download={result.zip.filename}
                className={buttonStyles('primary', 'md')}
              >
                <FileArchive className="size-4" aria-hidden="true" />
                Download all as ZIP
              </a>
            )}
          </>
        )
      }
    >
      {result && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {result.files.map((file) => (
            <li key={file.id} className="space-y-1.5">
              <div className="overflow-hidden rounded-md border border-line bg-raised/50">
                <img
                  src={pdfApi.downloadUrl(file.id)}
                  alt={file.filename}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
              <a
                href={pdfApi.downloadUrl(file.id)}
                download={file.filename}
                className="flex items-center justify-center gap-1 rounded-sm py-1 text-[11.5px] font-medium text-accent hover:text-accent-hover"
              >
                <Download className="size-3" aria-hidden="true" />
                {formatBytes(file.size)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
