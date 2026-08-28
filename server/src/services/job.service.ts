import { isDatabaseConnected } from '../config/database.js';
import { Job, type PdfOperation } from '../models/Job.js';
import { logger } from '../utils/logger.js';

export interface FileSummary {
  filename: string;
  size: number;
  pageCount: number;
}

export interface JobRecord {
  operation: PdfOperation;
  status: 'succeeded' | 'failed';
  inputs: FileSummary[];
  output?: FileSummary | null;
  durationMs: number;
  errorCode?: string | null;
  /**
   * Left `undefined` (never `null`) for an anonymous request — the field
   * must be genuinely absent, not merely empty, for the Job model's partial
   * TTL index to treat it as anonymous telemetry rather than a user's
   * visible history.
   */
  userId?: string;
}

/**
 * Records processing history.
 *
 * Recording is best-effort by design: a database problem must never turn a
 * successful PDF operation into a user-facing failure, so writes are fired
 * without blocking the response and failures are logged only.
 */
export const jobService = {
  record(record: JobRecord): void {
    if (!isDatabaseConnected()) return;

    void Job.create({
      operation: record.operation,
      status: record.status,
      inputs: record.inputs,
      output: record.output ?? null,
      durationMs: record.durationMs,
      errorCode: record.errorCode ?? null,
      // Only assigned when present — see the `userId` doc comment above.
      ...(record.userId ? { userId: record.userId } : {}),
    }).catch((error: unknown) => {
      logger.warn('Failed to record job', {
        operation: record.operation,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  },

  /** One user's own processing history, newest first. Never anyone else's. */
  async history(userId: string, limit = 200) {
    return Job.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  },

  /** Deletes one history entry, only if it belongs to this user. */
  async deleteOne(userId: string, jobId: string): Promise<boolean> {
    const result = await Job.deleteOne({ _id: jobId, userId });
    return result.deletedCount > 0;
  },

  /** Clears this user's entire history. */
  async deleteAll(userId: string): Promise<number> {
    const result = await Job.deleteMany({ userId });
    return result.deletedCount ?? 0;
  },

  /** Aggregate counts per operation, used by the /api/stats endpoint. */
  async summary(): Promise<{ operation: string; succeeded: number; failed: number }[]> {
    if (!isDatabaseConnected()) return [];

    const rows = await Job.aggregate<{
      _id: string;
      succeeded: number;
      failed: number;
    }>([
      {
        $group: {
          _id: '$operation',
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((row) => ({
      operation: row._id,
      succeeded: row.succeeded,
      failed: row.failed,
    }));
  },
};
