import { model, Schema, type InferSchemaType } from 'mongoose';

import { env } from '../config/env.js';

export const PDF_OPERATIONS = [
  'organize',
  'split',
  'merge',
  'watermark',
  'page-numbers',
  'remove-metadata',
  'sign',
  'protect',
  'to-jpg',
  'to-word',
  'images-to-pdf',
  'word-to-pdf',
  'fill-form',
  'remove-password',
  'ocr',
  'scanner-cleanup',
] as const;

export type PdfOperation = (typeof PDF_OPERATIONS)[number];

/**
 * Metadata about one file involved in a job.
 *
 * Only descriptive fields are stored — never the document bytes. PDFs are
 * short-lived working copies on disk and must not be duplicated into the
 * database.
 */
const fileSummarySchema = new Schema(
  {
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    pageCount: { type: Number, required: true },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    operation: { type: String, enum: PDF_OPERATIONS, required: true, index: true },
    status: { type: String, enum: ['succeeded', 'failed'], required: true, index: true },
    inputs: { type: [fileSummarySchema], default: [] },
    output: { type: fileSummarySchema, default: null },
    durationMs: { type: Number, required: true },
    errorCode: { type: String, default: null },
    /**
     * Set only when the request was authenticated. Anonymous jobs (the
     * majority — this app needs no account to process a file) leave the
     * field genuinely absent (no default here) rather than `null` — the TTL
     * index below matches on the key being absent, not on its value.
     */
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

/**
 * Anonymous jobs are operational telemetry and expire on their own so the
 * collection can't grow without bound. A signed-in user's history is a
 * feature they can see and manage, not telemetry — the partial filter keeps
 * every job with a `userId` out of this TTL entirely, so nothing a person
 * can see in their account ever disappears on a timer.
 */
jobSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: env.isProduction ? 30 * 24 * 3600 : 7 * 24 * 3600,
    partialFilterExpression: { userId: { $exists: false } },
  },
);

/** A user's own history, newest first — the only query `account.controller.ts` runs. */
jobSchema.index({ userId: 1, createdAt: -1 });

jobSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    // A history entry is always read back through a query already scoped to
    // its owner — restating whose it is here would be redundant, not useful.
    delete ret.userId;
    return ret;
  },
});

export type JobDocument = InferSchemaType<typeof jobSchema>;

export const Job = model('Job', jobSchema);
