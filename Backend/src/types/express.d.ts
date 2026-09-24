import type { AuthenticatedUser } from '../middlewares/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
