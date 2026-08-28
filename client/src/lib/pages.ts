import type { PageDraft } from '../types';

let draftCounter = 0;

/** Builds the initial, unmodified plan for a document. */
export function createDrafts(pageCount: number): PageDraft[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    key: `page-${++draftCounter}`,
    source: index + 1,
    rotation: 0,
  }));
}

/** True when the plan still matches the document exactly. */
export function isPristine(drafts: PageDraft[], pageCount: number): boolean {
  return (
    drafts.length === pageCount &&
    drafts.every((draft, index) => draft.source === index + 1 && draft.rotation === 0)
  );
}

/** Human-readable summary of what will change, for the Apply affordance. */
export function summariseChanges(drafts: PageDraft[], pageCount: number): string[] {
  const changes: string[] = [];

  const removed = pageCount - drafts.length;
  if (removed > 0) changes.push(`${removed} ${removed === 1 ? 'page' : 'pages'} removed`);

  const rotated = drafts.filter((draft) => draft.rotation % 360 !== 0).length;
  if (rotated > 0) changes.push(`${rotated} ${rotated === 1 ? 'page' : 'pages'} rotated`);

  const reordered =
    drafts.length > 0 && drafts.some((draft, index) => draft.source !== index + 1);
  // Deleting pages shifts positions too; only call it reordering when the
  // remaining pages are no longer in ascending source order.
  const outOfOrder = drafts.some(
    (draft, index) => index > 0 && draft.source < drafts[index - 1]!.source,
  );
  if (reordered && outOfOrder) changes.push('pages reordered');

  return changes;
}

export interface PageRangeResult {
  pages: number[];
  error: string | null;
}

const RANGE_TOKEN = /^(\d+)\s*(?:[-–—]\s*(\d+))?$/;

/**
 * Parses a page-range expression such as `1-3, 5, 8-10`.
 *
 * Accepts spaces freely and both hyphens and dashes, because people paste
 * ranges from all sorts of places.
 */
export function parsePageRange(input: string, pageCount: number): PageRangeResult {
  const trimmed = input.trim();
  if (!trimmed) return { pages: [], error: null };

  const pages = new Set<number>();

  for (const rawToken of trimmed.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;

    const match = RANGE_TOKEN.exec(token);
    if (!match) {
      return { pages: [], error: `“${token}” isn’t a valid page or range.` };
    }

    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);

    if (start < 1 || end < 1) {
      return { pages: [], error: 'Page numbers start at 1.' };
    }
    if (start > pageCount || end > pageCount) {
      return {
        pages: [],
        error: `This document only has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}.`,
      };
    }
    if (start > end) {
      return { pages: [], error: `“${token}” runs backwards — try ${end}-${start}.` };
    }

    for (let page = start; page <= end; page += 1) pages.add(page);
  }

  return { pages: [...pages].sort((a, b) => a - b), error: null };
}
