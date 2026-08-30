import type { Server } from 'node:http';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { savedFileService } from './services/savedFile.service.js';
import { storageService } from './services/storage.service.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  await storageService.init();
  await savedFileService.init();
  await connectDatabase();

  if (env.usingDevJwtSecret) {
    logger.warn('JWT_SECRET is not set — using an insecure development-only value.');
  }

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`PDF Toolbox API listening on http://localhost:${env.PORT}`, {
      environment: env.NODE_ENV,
    });
  });

  // Without this, a failed bind (most commonly EADDRINUSE from a leftover
  // dev server still holding the port) leaves the process alive but never
  // listening — every request then fails opaquely at the proxy instead of
  // with a clear reason here.
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use — stop whatever else is using it and restart.`);
    } else {
      logger.error('Server failed to start', { error: error.stack ?? error.message });
    }
    process.exit(1);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal} — shutting down.`);

    server.close(() => {
      void (async () => {
        await storageService.shutdown();
        await disconnectDatabase();
        process.exit(0);
      })();
    });

    // Do not hang forever on lingering connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start the server', {
    error: error instanceof Error ? (error.stack ?? error.message) : String(error),
  });
  process.exit(1);
});
