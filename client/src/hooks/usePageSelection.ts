import { useCallback, useMemo, useRef, useState } from 'react';

import type { PageDraft } from '../types';

export interface SelectionModifiers {
  /** Extend from the last clicked page to this one. */
  shift: boolean;
  toggle: boolean;
}

/**
 * Selection state for the page grid, including shift-click range selection.
 *
 * Keys are used rather than page numbers so a selection survives reordering.
 */
export function usePageSelection(drafts: PageDraft[]) {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const anchor = useRef<string | null>(null);

  const select = useCallback(
    (draft: PageDraft, modifiers: SelectionModifiers) => {
      setSelectedKeys((current) => {
        const next = new Set(current);
        const index = drafts.findIndex((item) => item.key === draft.key);

        if (modifiers.shift && anchor.current) {
          const anchorIndex = drafts.findIndex((item) => item.key === anchor.current);
          if (anchorIndex !== -1 && index !== -1) {
            const [from, to] =
              anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
            for (let cursor = from; cursor <= to; cursor += 1) {
              const item = drafts[cursor];
              if (item) next.add(item.key);
            }
            return next;
          }
        }

        if (next.has(draft.key)) next.delete(draft.key);
        else next.add(draft.key);

        anchor.current = draft.key;
        return next;
      });
    },
    [drafts],
  );

  /**
   * Sets the selection outright.
   *
   * Returns the existing set when the contents are unchanged. That matters:
   * derived selections (the split tool's page range) are recomputed on every
   * render, and handing back a fresh Set each time would loop forever.
   */
  const replace = useCallback((keys: Iterable<string>) => {
    setSelectedKeys((current) => {
      const next = new Set(keys);
      if (next.size === current.size && [...next].every((key) => current.has(key))) return current;
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(drafts.map((draft) => draft.key)));
  }, [drafts]);

  const clear = useCallback(() => {
    anchor.current = null;
    setSelectedKeys(new Set());
  }, []);

  /** Selected pages in document order — the order an extract will use. */
  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => selectedKeys.has(draft.key)),
    [drafts, selectedKeys],
  );

  return useMemo(
    () => ({ selectedKeys, selectedDrafts, select, replace, selectAll, clear }),
    [selectedKeys, selectedDrafts, select, replace, selectAll, clear],
  );
}
