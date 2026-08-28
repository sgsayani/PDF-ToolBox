import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useThumbnail } from '../../hooks/usePdfPreview';
import type { PdfPreview } from '../../lib/pdfPreview';
import type { FractionRect } from '../../types';
import { IconButton } from '../ui/IconButton';
import { Skeleton } from '../ui/Skeleton';
import { RectDrawSurface } from './RectDrawSurface';

interface PageDrawWorkspaceProps {
  totalPages: number;
  activePage: number;
  onActivePageChange: (page: number) => void;
  preview: PdfPreview | null;
  rectsForActivePage: FractionRect[];
  onDraw: (rect: FractionRect) => void;
  variant: 'crop' | 'redact';
  hint: string;
}

/**
 * The shared "one page at a time, draw a rectangle on it" surface behind
 * both Crop and Redact — they differ only in how the drawn rectangles are
 * used afterward (Crop: the latest one becomes the crop box, applied to
 * whichever pages the panel says; Redact: every rectangle drawn, on any
 * page, becomes a permanent redaction area).
 */
export function PageDrawWorkspace({
  totalPages,
  activePage,
  onActivePageChange,
  preview,
  rectsForActivePage,
  onDraw,
  variant,
  hint,
}: PageDrawWorkspaceProps) {
  const { src } = useThumbnail(preview, activePage, true);

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <IconButton
          label="Previous page"
          icon={<ChevronLeft />}
          size="sm"
          disabled={activePage <= 1}
          onClick={() => onActivePageChange(activePage - 1)}
        />
        <p className="text-[13px] font-medium text-ink">
          Page {activePage} of {totalPages}
        </p>
        <IconButton
          label="Next page"
          icon={<ChevronRight />}
          size="sm"
          disabled={activePage >= totalPages}
          onClick={() => onActivePageChange(activePage + 1)}
        />
      </div>

      {src ? (
        <RectDrawSurface imageSrc={src} rects={rectsForActivePage} onDraw={onDraw} variant={variant} />
      ) : (
        <Skeleton className="aspect-[4/5.35] w-full" />
      )}

      <p className="mt-3 text-center text-[12.5px] leading-relaxed text-ink-subtle">{hint}</p>
    </div>
  );
}
