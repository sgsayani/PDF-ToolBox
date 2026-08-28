import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { authService, SESSION_MAX_AGE_MS } from '../services/auth.service.js';
import { User } from '../models/User.js';

export const SESSION_COOKIE = 'pdftoolbox_session';

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  // Dev: client and API share an origin via the Vite proxy, so `lax` (and
  // plain HTTP) is fine. Production: client (Vercel) and API (a separate
  // host) are different origins, so the cookie needs `none` to be sent on a
  // cross-site fetch — which browsers only allow when `secure` is also set,
  // true here since `secure` already tracks production.
  sameSite: env.isProduction ? ('none' as const) : ('lax' as const),
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
};

/**
 * Reads and verifies the session cookie, if any, and attaches the user it
 * belongs to. Applied globally: cheap for the vast majority of requests
 * (anonymous PDF processing needs no account and this adds nothing to that
 * path beyond a cookie-presence check), and it means every route can simply
 * read `req.user` without knowing how sessions work.
 *
 * The id inside the token was assigned by this server when it signed the
 * token — it is not client-supplied — but the user it names is re-read from
 * the database on every request rather than trusted from the token's own
 * claims, so a deleted account or a plan change take effect immediately
 * instead of only once the token expires.
 */
export function attachUser(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token || !isDatabaseConnected()) {
      next();
      return;
    }

    const userId = authService.verifyToken(token);
    if (!userId) {
      next();
      return;
    }

    User.findById(userId)
      .then((user) => {
        if (user) {
          req.user = { id: String(user._id), email: user.email, name: user.name, plan: user.plan };
        }
        next();
      })
      .catch(() => next());
  };
}

/** Rejects the request unless `attachUser` found a valid session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(AppError.unauthorized(ErrorCode.AUTH_REQUIRED, 'Please log in to continue.'));
    return;
  }
  next();
}

/** Account features need MongoDB; PDF processing never does. */
export function requireDatabase(_req: Request, _res: Response, next: NextFunction): void {
  if (!isDatabaseConnected()) {
    next(
      AppError.serviceUnavailable(
        ErrorCode.ACCOUNTS_UNAVAILABLE,
        'Accounts are temporarily unavailable. PDF tools still work without signing in.',
      ),
    );
    return;
  }
  next();
}
