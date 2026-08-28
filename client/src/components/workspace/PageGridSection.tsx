import { FileWarning } from 'lucide-react';

import type { PdfPreview } from '../../lib/pdfPreview';
import type { PreviewStatus } from '../../hooks/usePdfPreview';
import type { PageDraft } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { PageGrid } from './PageGrid';
import { PageToolbar } from './PageToolbar';

interface PageGridSectionProps {
  drafts: PageDraft[];
  selected: ReadonlySet<string>;
  preview: PdfPreview | null;
  previewStatus: PreviewStatus;
  disabled: boolean;
  onSelect: (draft: PageDraft, modifiers: { shift: boolean; toggle: boolean }) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPreviewError: () => void;
}

/**
 * Page grid used by the watermark, page-number and signature tools.
 *
 * These tools only need to know *which* pages to target — never reordering,
 * rotation or deletion — so the grid here is read-only (`sortable={false}`,
 * `editable={false}`) and deliberately does not share state with the
 * Organize/Split tools' editable draft.
 */
export function PageGridSection({
  drafts,
  selected,
  preview,
  previewStatus,
  disabled,
  onSelect,
  onSelectAll,
  onClearSelection,
  onPreviewError,
}: PageGridSectionProps) {
  return (
    <>
      <PageToolbar
        totalPages={drafts.length}
        selectedCount={selected.size}
        disabled={disabled}
        editable={false}
        canUndo={false}
        canRedo={false}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onRotateSelected={() => {}}
        onDeleteSelected={() => {}}
        onUndo={() => {}}
        onRedo={() => {}}
      />

      <div className="p-4 sm:p-6">
        {previewStatus === 'error' ? (
          <EmptyState
            icon={<FileWarning />}
            title="We couldn’t render a preview"
            description="The document may use features our preview doesn’t support. You can still start over with a different file."
            action={
              <Button variant="secondary" onClick={onPreviewError}>
                Choose another PDF
              </Button>
            }
          />
        ) : previewStatus === 'loading' ? (
          <ul
            aria-label="Loading pages"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          >
            {Array.from({ length: Math.min(drafts.length, 12) }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-[4/5.35] w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <PageGrid
            drafts={drafts}
            selected={selected}
            preview={preview}
            disabled={disabled}
            sortable={false}
            editable={false}
            onReorder={() => {}}
            onSelect={onSelect}
          />
        )}
      </div>
    </>
  );
}
