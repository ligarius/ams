import { NextFunction, Request, Response } from 'express';
import logger from '@/lib/logger';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  if (err instanceof Error) {
    return res.status(500).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Unknown error' });
};
