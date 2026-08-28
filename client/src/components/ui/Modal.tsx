import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  /** Hides the close affordance for dialogs that demand an explicit choice. */
  dismissible?: boolean;
}

/**
 * Built on the native `<dialog>` element, which gives correct modal semantics,
 * focus trapping and Escape handling without a bespoke implementation.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (dismissible) onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [dismissible, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-panel',
        'backdrop:bg-ink/25 open:animate-none',
        size === 'sm' ? 'max-w-md' : 'max-w-lg',
      )}
      onClick={(event) => {
        // Clicks land on the dialog element itself only when they hit the backdrop.
        if (dismissible && event.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="space-y-1">
          <h2 id="modal-title" className="text-[15px] font-semibold">
            {title}
          </h2>
          {description && <p className="text-sm leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {dismissible && (
          <IconButton label="Close" icon={<X />} size="sm" onClick={onClose} className="-mt-1 -mr-1" />
        )}
      </div>

      {children && <div className="px-5 pt-4 text-sm text-ink-muted">{children}</div>}

      {footer && (
        <div className="mt-5 flex flex-col-reverse flex-wrap gap-2 border-t border-line bg-raised/60 px-5 py-3.5 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </dialog>
  );
}
