import { NextResponse } from 'next/server';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';

export async function GET() {
  const session = await ensureSession({ mutateCookies: true });
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
  }

  const companies = await prisma.company.findMany();
  return NextResponse.json(companies.map((company) => ({ id: company.id, name: company.name })));
}
