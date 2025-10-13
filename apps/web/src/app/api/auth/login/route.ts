import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/session';
import { AuthError, login } from '@backend/services/authService';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
    const payload = await login(parsed.data.email, parsed.data.password);
    await setSessionCookie(payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    await clearSessionCookie();
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error('Login request failed', error);
    return NextResponse.json(
      { message: 'No se pudo iniciar sesión. Intenta nuevamente más tarde.' },
      { status: 500 }
    );
  }
}
