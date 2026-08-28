import mongoose from 'mongoose';

// Mongoose is CommonJS: its enums are reachable through the default export
// only, even though the type declarations also expose them as named exports.
const { ConnectionStates } = mongoose;

import { env } from './env.js';
import { logger } from '../utils/logger.js';

let connected = false;

/**
 * Connects to MongoDB when a URI is configured.
 *
 * Persistence is an *enhancement* in this phase: it records processing history,
 * but no user-facing operation depends on it. If the database is unreachable
 * the API stays fully functional and simply stops recording jobs, which is
 * preferable to refusing to process files.
 */
export async function connectDatabase(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set — processing history will not be recorded.');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    logger.info('Connected to MongoDB');

    mongoose.connection.on('disconnected', () => {
      connected = false;
      logger.warn('Lost connection to MongoDB — history recording paused.');
    });
    mongoose.connection.on('connected', () => {
      connected = true;
    });

    return true;
  } catch (cause) {
    logger.warn('Could not connect to MongoDB — continuing without history recording.', {
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return connected && mongoose.connection.readyState === ConnectionStates.connected;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== ConnectionStates.disconnected) {
    await mongoose.disconnect();
  }
  connected = false;
}
