import { env } from '../config/env.js';
import { Job } from '../models/Job.js';
import type { PlanId } from '../models/User.js';

/**
 * What each plan allows. A static, code-owned registry rather than a
 * database collection — a plan is a policy decision, not user data. Adding a
 * paid tier later is adding a key here (and to `PLAN_IDS` in `User.ts`), not
 * a schema change or a migration.
 *
 * `maxFileSizeMb` matches the app's existing global ceiling for the only
 * plan that exists today, so signing in never makes uploading *more*
 * restrictive than using the tools anonymously — a future paid plan would
 * raise it, not lower it.
 */
export const PLAN_LIMITS: Record<PlanId, { maxProcessingPerDay: number; maxFileSizeMb: number }> = {
  free: {
    maxProcessingPerDay: 50,
    maxFileSizeMb: env.MAX_FILE_SIZE_MB,
  },
};

export function planLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const usageService = {
  /** Jobs recorded for this user since midnight UTC — succeeded and failed both count as an attempt. */
  async processedToday(userId: string): Promise<number> {
    return Job.countDocuments({ userId, createdAt: { $gte: startOfTodayUtc() } });
  },

  async usageFor(userId: string, plan: PlanId) {
    const limits = planLimits(plan);
    const processedToday = await this.processedToday(userId);
    return {
      plan,
      limits,
      usage: {
        processedToday,
        remainingToday: Math.max(0, limits.maxProcessingPerDay - processedToday),
      },
    };
  },
};
