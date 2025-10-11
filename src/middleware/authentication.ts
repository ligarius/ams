import { Request, Response, NextFunction } from 'express';
import prisma, { User } from '@/lib/prisma';
import { verifyAccessToken } from '@/utils/token';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }
  const [, token] = authHeader.split(' ');
  if (!token) {
    return res.status(401).json({ message: 'Invalid Authorization header' });
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = Number.parseInt(payload.sub, 10);
    const isValidUserId = Number.isSafeInteger(userId) && userId > 0;
    if (!isValidUserId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token', error: error instanceof Error ? error.message : String(error) });
  }
};

export const requireRole = (role: 'ADMIN' | 'CONSULTANT' | 'CLIENT') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
