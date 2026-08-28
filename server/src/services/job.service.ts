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
    }).catch((error: unknown) => {
      logger.warn('Failed to record job', {
        operation: record.operation,
        error: error instanceof Error ? error.message : String(error),
      });
    });
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
