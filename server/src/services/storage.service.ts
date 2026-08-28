import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * The file kinds this store ever holds. `pdf` is the default and by far the
 * most common — every Phase 1/2 operation only ever produces PDFs. Phase 3
 * adds outputs (and, for images, inputs) that genuinely are a different kind
 * of file, so the store has to know what it's holding rather than assume PDF.
 */
export const STORED_FILE_KINDS = [
  'pdf',
  'jpg',
  'png',
  'txt',
  'docx',
  'zip',
  'html',
  'csv',
  'xlsx',
  'pptx',
] as const;
export type StoredFileKind = (typeof STORED_FILE_KINDS)[number];

/** Exported so other permanent-file code paths (saved files) use the exact same mapping. */
export const CONTENT_TYPES: Record<StoredFileKind, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  txt: 'text/plain; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
  html: 'text/html; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Metadata for one short-lived working copy of a file. */
export interface StoredFile {
  id: string;
  /** Display name shown to the user and used for the download. */
  filename: string;
  size: number;
  pageCount: number;
  kind: StoredFileKind;
  contentType: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface SaveFileInput {
  data: Uint8Array;
  filename: string;
  pageCount: number;
  /** Defaults to `'pdf'` — every existing caller stores a PDF and is unaffected. */
  kind?: StoredFileKind;
}

const FILE_ID_PATTERN = /^[a-f0-9]{32}$/;

/**
 * Temporary file store backed by the local filesystem.
 *
 * Files live under a single flat directory, named by a random opaque id so a
 * client can never influence the path on disk. Metadata is held in memory —
 * these files are deliberately short-lived working copies, not durable state,
 * so nothing of value is lost on restart (the directory is purged at boot).
 *
 * The interface is intentionally narrow (`save` / `read` / `remove`) so it can
 * be swapped for object storage without touching callers.
 */
class StorageService {
  private readonly files = new Map<string, StoredFile>();
  private sweeper: NodeJS.Timeout | undefined;

  async init(): Promise<void> {
    await fs.mkdir(env.storageDir, { recursive: true });
    await this.purgeDirectory();

    this.sweeper = setInterval(() => {
      void this.sweep();
    }, env.cleanupIntervalMs);
    this.sweeper.unref();

    logger.info('Storage ready', { dir: env.storageDir, ttlMinutes: env.FILE_TTL_MINUTES });
  }

  async shutdown(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    await this.purgeDirectory();
    this.files.clear();
  }

  async save({ data, filename, pageCount, kind = 'pdf' }: SaveFileInput): Promise<StoredFile> {
    const id = crypto.randomBytes(16).toString('hex');
    const now = new Date();

    const record: StoredFile = {
      id,
      filename,
      size: data.byteLength,
      pageCount,
      kind,
      contentType: CONTENT_TYPES[kind],
      createdAt: now,
      expiresAt: new Date(now.getTime() + env.fileTtlMs),
    };

    // `wx` fails rather than overwriting, so an id collision can never clobber
    // another user's file.
    await fs.writeFile(this.resolvePath(id, kind), data, { flag: 'wx', mode: 0o600 });
    this.files.set(id, record);

    return record;
  }

  /** Returns metadata for a live file, or throws a client-safe error. */
  get(id: string): StoredFile {
    if (!FILE_ID_PATTERN.test(id)) {
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
    }

    const record = this.files.get(id);
    if (!record) {
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      void this.remove(id);
      throw AppError.notFound(
        ErrorCode.FILE_EXPIRED,
        'This file has expired. Please upload it again.',
      );
    }

    return record;
  }

  async read(id: string): Promise<Uint8Array> {
    const record = this.get(id);
    try {
      return await fs.readFile(this.resolvePath(record.id, record.kind));
    } catch (cause) {
      // Metadata and disk disagree — treat as gone rather than leaking an fs error.
      this.files.delete(id);
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.', {
        cause,
      });
    }
  }

  async remove(id: string): Promise<void> {
    if (!FILE_ID_PATTERN.test(id)) return;

    // The kind (and so the on-disk extension) is only known via the record,
    // so it has to be read before the map entry disappears.
    const record = this.files.get(id);
    this.files.delete(id);
    if (!record) return;

    await fs.rm(this.resolvePath(id, record.kind), { force: true });
  }

  /** Deletes files past their TTL. Runs on an interval and is safe to call ad hoc. */
  async sweep(): Promise<number> {
    const now = Date.now();
    const expired = [...this.files.values()].filter((file) => file.expiresAt.getTime() <= now);

    await Promise.all(expired.map((file) => this.remove(file.id)));

    if (expired.length > 0) {
      logger.debug('Swept expired files', { count: expired.length });
    }
    return expired.length;
  }

  /**
   * Resolves an id to an absolute path inside the storage directory.
   *
   * The id pattern already excludes separators; the containment check is a
   * second, explicit guard against path traversal.
   */
  private resolvePath(id: string, kind: StoredFileKind): string {
    if (!FILE_ID_PATTERN.test(id)) {
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
    }

    const target = path.join(env.storageDir, `${id}.${kind}`);
    const relative = path.relative(env.storageDir, target);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
    }
    return target;
  }

  private async purgeDirectory(): Promise<void> {
    try {
      const entries = await fs.readdir(env.storageDir);
      const knownSuffixes = STORED_FILE_KINDS.map((kind) => `.${kind}`);
      await Promise.all(
        entries
          .filter((entry) => knownSuffixes.some((suffix) => entry.endsWith(suffix)))
          .map((entry) => fs.rm(path.join(env.storageDir, entry), { force: true })),
      );
    } catch (cause) {
      logger.warn('Could not purge storage directory', { error: String(cause) });
    }
  }
}

export const storageService = new StorageService();
