import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_RANK = env.isProduction ? LEVEL_RANK.info : LEVEL_RANK.debug;

const CONSOLE: Record<Level, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] < MIN_RANK || env.isTest) return;

  const timestamp = new Date().toISOString();

  if (env.isProduction) {
    // Structured single-line output so a log collector can parse it.
    CONSOLE[level](JSON.stringify({ timestamp, level, message, ...context }));
    return;
  }

  const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  CONSOLE[level](`${timestamp} ${level.toUpperCase().padEnd(5)} ${message}${suffix}`);
}

/**
 * Minimal leveled logger. Technical detail (stack traces, library errors) is
 * logged here and deliberately never forwarded to API clients.
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
