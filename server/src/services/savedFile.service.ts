import fs from 'node:fs/promises';
import path from 'node:path';

import { Types } from 'mongoose';

import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { SavedFile, type SavedFileDocument } from '../models/SavedFile.js';
import type { StoredFileKind } from './storage.service.js';

export interface SaveFileInput {
  userId: string;
  data: Uint8Array;
  filename: string;
  pageCount: number;
  kind: StoredFileKind;
}

/**
 * Permanent storage for files a user has chosen to keep.
 *
 * Deliberately a separate directory and code path from `storage.service.ts`:
 * that store is swept on a TTL and wiped on every boot by design — exactly
 * wrong for something a person expects to still be there next week. This
 * follows the same shape (disk for bytes, a random-looking opaque id, a
 * path-containment check before every read), but nothing here ever expires
 * on its own; a file leaves only via an explicit delete, and ownership is
 * always checked against the caller's own id, never trusted from a client.
 */
function resolvePath(id: string, kind: StoredFileKind): string {
  const target = path.join(env.savedStorageDir, `${id}.${kind}`);
  const relative = path.relative(env.savedStorageDir, target);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
  }
  return target;
}

async function ownedRecord(userId: string, id: string): Promise<SavedFileDocument> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
  }

  const record = await SavedFile.findOne({ _id: id, userId });
  if (!record) {
    throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.');
  }
  return record;
}

export const savedFileService = {
  async init(): Promise<void> {
    await fs.mkdir(env.savedStorageDir, { recursive: true });
  },

  async save({ userId, data, filename, pageCount, kind }: SaveFileInput): Promise<SavedFileDocument> {
    const record = await SavedFile.create({ userId, filename, size: data.byteLength, pageCount, kind });

    try {
      await fs.writeFile(resolvePath(String(record._id), kind), data, { flag: 'wx', mode: 0o600 });
    } catch (cause) {
      // Don't leave an orphaned Mongo record pointing at a file that was
      // never actually written.
      await record.deleteOne();
      throw AppError.internal('Failed to save this file.', { cause });
    }

    return record;
  },

  /** A user's saved files, newest first. Never includes anyone else's. */
  async list(userId: string): Promise<SavedFileDocument[]> {
    return SavedFile.find({ userId }).sort({ createdAt: -1 });
  },

  async read(userId: string, id: string): Promise<{ record: SavedFileDocument; data: Uint8Array }> {
    const record = await ownedRecord(userId, id);
    try {
      const data = await fs.readFile(resolvePath(String(record._id), record.kind));
      return { record, data };
    } catch (cause) {
      throw AppError.notFound(ErrorCode.FILE_NOT_FOUND, 'That file is no longer available.', { cause });
    }
  },

  async remove(userId: string, id: string): Promise<void> {
    const record = await ownedRecord(userId, id);
    await record.deleteOne();
    await fs.rm(resolvePath(String(record._id), record.kind), { force: true });
  },
};
