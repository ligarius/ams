import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { SessionPayload } from './session';

interface SessionResponse {
  authenticated: boolean;
  session?: SessionPayload;
}

const getBaseUrl = () => {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host) {
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!fallback) {
    throw new Error('Unable to determine host for session fetch');
  }
  return fallback.replace(/\/$/, '');
};

const buildCookieHeader = () => {
  const cookieStore = cookies();
  const entries = cookieStore.getAll();
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(({ name, value }) => `${name}=${value}`).join('; ');
};

const fetchServerSessionUncached = async (): Promise<SessionPayload | null> => {
  const baseUrl = getBaseUrl();
  const cookieHeader = buildCookieHeader();
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  const body = (await response.json()) as SessionResponse;
  if (!body.authenticated || !body.session) {
    return null;
  }

  return body.session;
};

export const fetchServerSession = cache(fetchServerSessionUncached);
