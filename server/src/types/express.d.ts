import type { PlanId } from '../models/User.js';

/** The identity attached to a request once its session cookie has been verified. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by `attachUser` when the request carries a valid session. Absent for anonymous requests. */
      user?: AuthUser;
    }
  }
}
