import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { logout as backendLogout } from '@backend/services/authService';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session) {
      await backendLogout(session.user.id);
    }
  } finally {
    await clearSessionCookie();
  }

  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
