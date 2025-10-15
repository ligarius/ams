import { NextResponse } from 'next/server';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { getProjectOverview } from '@backend/services/projectService';

interface RouteContext {
  params: { projectId: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const projectId = Number(params.projectId);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ message: 'Identificador de proyecto inválido' }, { status: 400 });
  }

  const session = await ensureSession({ mutateCookies: true });
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const overview = await getProjectOverview(projectId, actor);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Project not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }
    console.error('Failed to fetch project overview', error);
    return NextResponse.json(
      { message: 'Error inesperado al obtener el overview del proyecto' },
      { status: 500 }
    );
  }
}
