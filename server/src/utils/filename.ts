import path from 'node:path';

const UNSAFE_CHARS = /[^\w.\- ]+/g;
const COLLAPSE_SEPARATORS = /[\s_]+/g;

/**
 * Reduces a client-supplied filename to a safe basename.
 *
 * Strips any directory component (defeating `../` traversal and absolute
 * paths), removes characters that are awkward in headers or on disk, and
 * guarantees a non-empty result.
 */
export function sanitizeFilename(input: string, fallback = 'document.pdf'): string {
  const basename = path.basename(input.replace(/\\/g, '/')).trim();
  const cleaned = basename.replace(UNSAFE_CHARS, '').replace(COLLAPSE_SEPARATORS, ' ').trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  return cleaned.slice(0, 180);
}

/** Returns the filename without its extension. */
export function stripExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext ? filename.slice(0, -ext.length) : filename;
}

/**
 * Builds a descriptive output name, e.g. `report.pdf` + `merged` -> `report-merged.pdf`.
 * Repeated operations do not stack suffixes endlessly: `report-merged.pdf` +
 * `merged` stays `report-merged.pdf`.
 *
 * `extension` defaults to `pdf` — every Phase 1/2 caller produces a PDF and is
 * unaffected. Phase 3 conversions pass their own (`jpg`, `docx`, ...).
 */
export function withSuffix(filename: string, suffix: string, extension = 'pdf'): string {
  const base = stripExtension(sanitizeFilename(filename));
  if (base.toLowerCase().endsWith(`-${suffix.toLowerCase()}`)) return `${base}.${extension}`;
  return `${base}-${suffix}.${extension}`;
}
