import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { AppError, ErrorCode } from './errors/AppError.js';

export function createApp(): Express {
  const app = express();

  // Behind a proxy, trust one hop so rate limiting keys on the real client IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API returns JSON and PDF bytes only; a restrictive default is fine.
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser callers send no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          AppError.badRequest(ErrorCode.VALIDATION_FAILED, 'This origin is not allowed.'),
        );
      },
      methods: ['GET', 'POST', 'DELETE'],
      maxAge: 86_400,
    }),
  );

  // Operation payloads are small JSON documents; uploads use multipart instead.
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
