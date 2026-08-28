import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { attachUser } from './middleware/auth.js';
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
      // The session lives in a cookie, so the browser needs to know it's
      // allowed to send one — safe here because `origin` above never
      // reflects a wildcard, only the explicit allow-list.
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      maxAge: 86_400,
    }),
  );

  // Only used to read the session cookie; nothing here is a secret the
  // client could tamper with undetected — the JWT it carries is signed.
  app.use(cookieParser());

  // Operation payloads are small JSON documents; uploads use multipart instead.
  app.use(express.json({ limit: '256kb' }));

  app.use(attachUser());

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
