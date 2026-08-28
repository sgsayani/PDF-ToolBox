import { Router } from 'express';

import { env } from '../config/env.js';
import { isDatabaseConnected } from '../config/database.js';
import { jobService } from '../services/job.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { documentsRouter } from './documents.routes.js';
import { filesRouter } from './files.routes.js';
import { imagesRouter } from './images.routes.js';
import { pdfRouter } from './pdf.routes.js';
import { securityRouter } from './security.routes.js';

export const apiRouter = Router();

/** Liveness plus the limits the client needs in order to validate locally. */
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    historyEnabled: isDatabaseConnected(),
    limits: {
      maxFileSizeMb: env.MAX_FILE_SIZE_MB,
      maxFilesPerRequest: env.MAX_FILES_PER_REQUEST,
      fileTtlMinutes: env.FILE_TTL_MINUTES,
    },
  });
});

/** Aggregated processing history. Empty when the database is not configured. */
apiRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ enabled: isDatabaseConnected(), operations: await jobService.summary() });
  }),
);

apiRouter.use('/files', filesRouter);
apiRouter.use('/pdf', pdfRouter);
apiRouter.use('/security', securityRouter);
apiRouter.use('/images', imagesRouter);
apiRouter.use('/documents', documentsRouter);
