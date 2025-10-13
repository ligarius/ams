import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { AuthError, refresh as refreshSessionFromBackend } from '@backend/services/authService';

const SESSION_COOKIE = 'ams.session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: number;
  email: string;
  role: string;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const encodeSession = (session: SessionPayload) =>
  encodeURIComponent(JSON.stringify(session));

const decodeSession = (value: string): SessionPayload | null => {
  try {
    return JSON.parse(decodeURIComponent(value)) as SessionPayload;
  } catch (error) {
    console.error('Failed to parse session cookie', error);
    return null;
  }
};

export const setSessionCookie = async (session: SessionPayload) => {
  cookies().set({
    name: SESSION_COOKIE,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
};

export const clearSessionCookie = async () => {
  cookies().delete(SESSION_COOKIE);
};

interface EnsureSessionOptions {
  mutateCookies?: boolean;
}

export const getSession = async (): Promise<SessionPayload | null> => {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return decodeSession(raw);
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = jwtDecode<{ exp?: number }>(token);
    if (!payload.exp) {
      return true;
    }
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - 15_000; // refresh 15s before expiry
  } catch (error) {
    console.error('Failed to decode token', error);
    return true;
  }
};

const refreshSession = async (
  session: SessionPayload,
  options: EnsureSessionOptions
): Promise<SessionPayload | null> => {
  if (!options.mutateCookies) {
    return null;
  }
  try {
    const result = await refreshSessionFromBackend(session.refreshToken);
    const updated: SessionPayload = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
    if (options.mutateCookies) {
      await setSessionCookie(updated);
    }
    return updated;
  } catch (error) {
    if (error instanceof AuthError) {
      console.warn('Unable to refresh session', { message: error.message, status: error.status });
    } else {
      console.warn('Unable to refresh session', error);
    }
    if (options.mutateCookies) {
      await clearSessionCookie();
    }
    return null;
  }
};

export const ensureSession = async (
  options: EnsureSessionOptions = {}
): Promise<SessionPayload | null> => {
  const existing = await getSession();
  if (!existing) {
    return null;
  }
  if (!isTokenExpired(existing.accessToken)) {
    return existing;
  }
  return refreshSession(existing, options);
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await ensureSession();
  return session?.user ?? null;
};
