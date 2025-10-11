import bcrypt from 'bcrypt';
import { addMinutes, isAfter } from 'date-fns';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import env from '@/config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/token';

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.auditLog.create({ data: { userId: null, action: 'AUTH_LOGIN_FAILED', metadata: { email } } });
    throw new AuthError('Invalid credentials', 401);
  }

  if (user.lockedUntil && isAfter(user.lockedUntil, new Date())) {
    await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGIN_BLOCKED', metadata: { email } } });
    throw new AuthError('Account temporarily locked. Try again later.', 423);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;
    if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
      lockedUntil = addMinutes(new Date(), env.LOGIN_LOCK_WINDOW_MINUTES);
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts % env.LOGIN_MAX_ATTEMPTS, lockedUntil } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGIN_FAILED', metadata: { attempts } } });
    if (lockedUntil) {
      throw new AuthError('Account locked due to too many failed attempts', 423);
    }
    throw new AuthError('Invalid credentials', 401);
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });

  const tokenId = randomUUID();
  const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
  const refreshToken = signRefreshToken({ sub: String(user.id), tokenId });
  await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken } });
  await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGIN_SUCCESS' } });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};

export const refresh = async (token: string): Promise<LoginResult> => {
  try {
    const payload = verifyRefreshToken(token);
    const userId = Number(payload.sub);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AuthError('Invalid refresh token', 401);
    }
    const storedToken = await prisma.refreshToken.findFirst({ where: { userId, token } });
    if (!storedToken) {
      throw new AuthError('Refresh token revoked', 401);
    }
    const tokenId = randomUUID();
    const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
    const newRefreshToken = signRefreshToken({ sub: String(user.id), tokenId });
    await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.create({ data: { userId: user.id, token: newRefreshToken } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_REFRESH_SUCCESS' } });
    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid refresh token', 401);
  }
};

export const logout = async (userId: number) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.auditLog.create({ data: { userId, action: 'AUTH_LOGOUT' } });
};
