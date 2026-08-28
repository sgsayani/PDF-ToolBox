import { useCallback, useEffect, useState } from 'react';

/**
 * Reports whether an element has entered the viewport.
 *
 * Used to render page thumbnails lazily: a 300-page document should not
 * rasterise 300 pages to show the first screen. Once seen, an element stays
 * "in view" so scrolling back does not discard work.
 *
 * The returned ref setter is stable, and callers must keep their own ref
 * callback stable too — an unstable one makes React detach and re-attach on
 * every render.
 */
export function useInView<T extends HTMLElement>(rootMargin = '400px'): {
  setRef: (node: T | null) => void;
  inView: boolean;
} {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  // Storing the node in state (rather than a ref) is what lets the effect below
  // run as soon as the element is attached.
  const setRef = useCallback((next: T | null) => setNode(next), []);

  useEffect(() => {
    if (!node || inView) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView, rootMargin]);

  return { setRef, inView };
}
