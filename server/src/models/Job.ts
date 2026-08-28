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
     * TTL index: history is operational telemetry, not a permanent record, so
     * it expires on its own and cannot grow without bound.
     */
    createdAt: { type: Date, default: Date.now, expires: env.isProduction ? '30d' : '7d' },
  },
  { versionKey: false },
);

export type JobDocument = InferSchemaType<typeof jobSchema>;

export const Job = model('Job', jobSchema);
