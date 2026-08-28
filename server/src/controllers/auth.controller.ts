import type { Request, Response } from 'express';

import { SESSION_COOKIE, sessionCookieOptions } from '../middleware/auth.js';
import { authService } from '../services/auth.service.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { User, type UserDocument } from '../models/User.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '../validators/auth.validators.js';

function setSession(res: Response, user: UserDocument): void {
  const token = authService.issueToken(user);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
}

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RegisterInput;
    const user = await authService.register(body);
    setSession(res, user);
    res.status(201).json({ user });
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginInput;
    const user = await authService.login(body);
    setSession(res, user);
    res.status(200).json({ user });
  },

  logout: (_req: Request, res: Response): void => {
    // A browser matches a clearing Set-Cookie against the same attributes
    // the cookie was set with (path, sameSite, secure) — passing only
    // `path` can silently fail to clear a `SameSite=None` cookie in some
    // browsers, leaving the session cookie stuck.
    res.clearCookie(SESSION_COOKIE, {
      path: sessionCookieOptions.path,
      sameSite: sessionCookieOptions.sameSite,
      secure: sessionCookieOptions.secure,
    });
    res.status(204).end();
  },

  /** Restores a session on page load — the client calls this once, on boot, using the cookie alone. */
  me: async (req: Request, res: Response): Promise<void> => {
    // `attachUser` already re-reads the record from the database; this just
    // returns the same shape `register`/`login` do.
    if (!req.user) {
      throw AppError.unauthorized(ErrorCode.AUTH_REQUIRED, 'Please log in to continue.');
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      throw AppError.unauthorized(ErrorCode.AUTH_REQUIRED, 'Please log in to continue.');
    }
    res.status(200).json({ user });
  },

  updateProfile: async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body as UpdateProfileInput;
    // `req.user` is guaranteed by `requireAuth` ahead of this handler.
    const user = await User.findByIdAndUpdate(req.user!.id, { name }, { new: true });
    if (!user) {
      throw AppError.unauthorized(ErrorCode.AUTH_REQUIRED, 'Please log in to continue.');
    }
    res.status(200).json({ user });
  },
};
