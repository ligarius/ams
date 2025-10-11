import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }).catch(() => undefined);
    }
  } finally {
    await clearSessionCookie();
  }

  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
