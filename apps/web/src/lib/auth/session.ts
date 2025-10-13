import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

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

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

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
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }
    const result = (await response.json()) as SessionPayload;
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
    console.warn('Unable to refresh session', error);
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
