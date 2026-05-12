import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/client';
import { UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: { id: string; email?: string };
  accessToken?: string;
}

export const authMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing bearer token');

    const token = header.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedError('Invalid token');

    req.user = { id: data.user.id, email: data.user.email };
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
};
