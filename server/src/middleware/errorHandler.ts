import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }

  res.status(500).json({ error: 'Internal server error' });
};
