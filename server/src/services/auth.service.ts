import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { User, type UserDocument } from '../models/User.js';

/** Cost factor for bcrypt. 12 is a reasonable default for an interactive login. */
const BCRYPT_ROUNDS = 12;

/** How long a session stays valid, and how long the cookie carrying it lasts. */
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register({ email, password, name }: RegisterInput): Promise<UserDocument> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw AppError.conflict(ErrorCode.EMAIL_TAKEN, 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return User.create({ email: email.toLowerCase(), passwordHash, name });
  },

  /**
   * Verifies credentials. The same message covers "no such account" and
   * "wrong password" — distinguishing them tells an attacker which emails
   * are registered.
   */
  async login({ email, password }: LoginInput): Promise<UserDocument> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    const genericError = AppError.unauthorized(
      ErrorCode.INVALID_CREDENTIALS,
      'That email or password is incorrect.',
    );

    if (!user) throw genericError;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw genericError;

    return user;
  },

  issueToken(user: UserDocument): string {
    const payload: TokenPayload = { sub: String(user._id) };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  },

  /** Verifies a session token and returns the user id it was issued for, or `null` if invalid/expired. */
  verifyToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
      return payload.sub;
    } catch {
      return null;
    }
  },
};
