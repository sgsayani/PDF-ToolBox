/** Formats a byte count for display, e.g. `1.4 MB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

/** `1 page` / `12 pages`. */
export function formatPageCount(count: number): string {
  return `${count} ${count === 1 ? 'page' : 'pages'}`;
}

/** `1 file` / `4 files`. */
export function formatFileCount(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`;
}

/** Collapses sorted page numbers into a compact label: `1–3, 7, 10–12`. */
export function formatPageList(pages: number[], limit = 6): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'none';

  const ranges: string[] = [];
  let start = sorted[0]!;
  let previous = start;

  for (const page of sorted.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}–${previous}`);
    start = page;
    previous = page;
  }
  ranges.push(start === previous ? `${start}` : `${start}–${previous}`);

  if (ranges.length > limit) {
    return `${ranges.slice(0, limit).join(', ')} +${ranges.length - limit} more`;
  }
  return ranges.join(', ');
}
