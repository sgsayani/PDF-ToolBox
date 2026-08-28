import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

import { STORED_FILE_KINDS } from '../services/storage.service.js';

/**
 * Metadata for a file a user has chosen to keep, indefinitely, past the
 * short-lived working copy it started as. The bytes live on disk (see
 * `savedFile.service.ts`), keyed by this document's own id — Mongo holds
 * only the description, never the PDF itself.
 */
const savedFileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    pageCount: { type: Number, required: true },
    kind: { type: String, enum: STORED_FILE_KINDS, required: true },
    createdAt: { type: Date, default: Date.now },
  },
);

// A user's own saved-files list, newest first — the only access pattern this collection serves.
savedFileSchema.index({ userId: 1, createdAt: -1 });

savedFileSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

export type SavedFileSchema = InferSchemaType<typeof savedFileSchema>;
export type SavedFileDocument = HydratedDocument<SavedFileSchema>;

export const SavedFile = model('SavedFile', savedFileSchema);
