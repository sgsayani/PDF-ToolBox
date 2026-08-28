import { formatBytes } from './format';

/** Mirrors the server's accepted types. The server re-checks the bytes. */
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/octet-stream',
  'binary/octet-stream',
  '',
]);

const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/octet-stream',
  'binary/octet-stream',
  '',
]);
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Client-side pre-flight for a chosen file.
 *
 * This exists to give immediate, specific feedback — it is *not* a security
 * boundary. The server validates type, size and the actual PDF structure
 * independently.
 *
 * @returns a message to show the user, or `null` when the file looks usable.
 */
export function validatePdfFile(file: File, maxBytes: number): string | null {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');

  if (!hasPdfExtension) {
    return `“${file.name}” isn’t a PDF. Only .pdf files can be used here.`;
  }

  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return `“${file.name}” doesn’t look like a PDF file.`;
  }

  if (file.size === 0) {
    return `“${file.name}” is empty.`;
  }

  if (file.size > maxBytes) {
    return `“${file.name}” is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`;
  }

  return null;
}

/** Client-side pre-flight for a chosen image. Same caveat as `validatePdfFile`. */
export function validateImageFile(file: File, maxBytes: number): string | null {
  const name = file.name.toLowerCase();
  const hasImageExtension = IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasImageExtension) {
    return `“${file.name}” isn’t a JPG or PNG. Only those can be used here.`;
  }
  if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
    return `“${file.name}” doesn’t look like a JPG or PNG image.`;
  }
  if (file.size === 0) {
    return `“${file.name}” is empty.`;
  }
  if (file.size > maxBytes) {
    return `“${file.name}” is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`;
  }

  return null;
}

/**
 * Filters a DataTransfer/FileList down to plain files, ignoring directories.
 * `extensions` defaults to PDF; pass `['.jpg', '.jpeg', '.png']` for images.
 */
export function toFileArray(list: FileList | null, extensions: string[] = ['.pdf']): File[] {
  if (!list) return [];
  return Array.from(list).filter(
    (file) => file.size > 0 || extensions.some((ext) => file.name.toLowerCase().endsWith(ext)),
  );
}
