import { useEffect, useRef, useState } from 'react';

import { PdfPreview } from '../lib/pdfPreview';

export type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PreviewState {
  preview: PdfPreview | null;
  status: PreviewStatus;
}

/**
 * Opens a PDF for preview and tears it down when the document changes.
 *
 * Previews are rendered from the bytes already in the browser, so opening the
 * workspace costs no extra network round trip.
 */
export function usePdfPreview(blob: Blob | null): PreviewState {
  const [state, setState] = useState<PreviewState>({ preview: null, status: 'idle' });

  useEffect(() => {
    if (!blob) {
      setState({ preview: null, status: 'idle' });
      return;
    }

    let cancelled = false;
    let opened: PdfPreview | null = null;

    setState({ preview: null, status: 'loading' });

    PdfPreview.open(blob)
      .then((preview) => {
        opened = preview;
        if (cancelled) {
          preview.destroy();
          return;
        }
        setState({ preview, status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) setState({ preview: null, status: 'error' });
      });

    return () => {
      cancelled = true;
      opened?.destroy();
    };
  }, [blob]);

  return state;
}

/**
 * Resolves one page's thumbnail, rendering it on first request.
 * `enabled` is driven by viewport visibility so off-screen pages cost nothing.
 */
export function useThumbnail(
  preview: PdfPreview | null,
  pageNumber: number,
  enabled: boolean,
): { src: string | null; failed: boolean } {
  const [src, setSrc] = useState<string | null>(() => preview?.peek(pageNumber) ?? null);
  const [failed, setFailed] = useState(false);
  const previousKey = useRef<string>('');

  useEffect(() => {
    const key = `${pageNumber}`;
    if (previousKey.current !== key) {
      previousKey.current = key;
      setSrc(preview?.peek(pageNumber) ?? null);
      setFailed(false);
    }

    if (!preview || !enabled) return;

    const cached = preview.peek(pageNumber);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    preview
      .getThumbnail(pageNumber)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [preview, pageNumber, enabled]);

  return { src, failed };
}
