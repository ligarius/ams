import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      await clearSessionCookie();
      return NextResponse.json(
        { message: errorBody?.message ?? 'Credenciales inválidas' },
        { status: response.status }
      );
    }

    const payload = await response.json();
    await setSessionCookie(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login request failed', error);
    await clearSessionCookie();
    return NextResponse.json(
      { message: 'No se pudo iniciar sesión. Intenta nuevamente más tarde.' },
      { status: 500 }
    );
  }
}
