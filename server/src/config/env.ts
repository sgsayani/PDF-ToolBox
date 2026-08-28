import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

/**
 * Environment configuration.
 *
 * Parsed and validated once at boot so the rest of the application can rely on
 * well-typed values instead of reaching into `process.env` with string casts.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  /** Comma-separated list of origins allowed to call the API. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  /** Optional. When absent the API runs with job persistence disabled. */
  MONGODB_URI: z.string().url().optional(),

  /** Directory used for short-lived working copies of uploaded/produced PDFs. */
  STORAGE_DIR: z.string().default('.tmp/storage'),

  /** Largest accepted single file, in megabytes. */
  MAX_FILE_SIZE_MB: z.coerce.number().positive().max(200).default(50),

  /** Largest accepted number of files in one multi-file request (merge). */
  MAX_FILES_PER_REQUEST: z.coerce.number().int().positive().max(50).default(20),

  /** How long a stored working file survives before the sweeper removes it. */
  FILE_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  /** How often the sweeper runs. */
  CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(10),

  /** Requests per window, per IP, for the processing endpoints. */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  /**
   * Signs session tokens. Required in production; in development an
   * insecure fallback is used (with a startup warning) so the app runs
   * without extra setup.
   */
  JWT_SECRET: z.string().min(32).optional(),

  /** Directory for saved files. Unlike `STORAGE_DIR`, never purged or swept — files live until deleted. */
  SAVED_STORAGE_DIR: z.string().default('.tmp/saved'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

if (isProduction && !raw.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET must be set (32+ characters) in production — accounts cannot run without it.',
  );
}

// A fixed, clearly-fake value in development only, so the app runs without
// extra setup; every session it signs is worthless once the process ends.
const DEV_ONLY_JWT_SECRET = 'dev-insecure-secret-do-not-use-in-production-00000000';

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  storageDir: path.resolve(process.cwd(), raw.STORAGE_DIR),
  savedStorageDir: path.resolve(process.cwd(), raw.SAVED_STORAGE_DIR),
  maxFileSizeBytes: raw.MAX_FILE_SIZE_MB * 1024 * 1024,
  fileTtlMs: raw.FILE_TTL_MINUTES * 60 * 1000,
  cleanupIntervalMs: raw.CLEANUP_INTERVAL_MINUTES * 60 * 1000,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  jwtSecret: raw.JWT_SECRET ?? DEV_ONLY_JWT_SECRET,
  usingDevJwtSecret: !raw.JWT_SECRET,
} as const;

export type Env = typeof env;
