import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { createInitiative, listInitiatives } from '@backend/services/initiativeService';

interface RouteContext {
  params: { projectId: string };
}

const parseProjectId = (params: RouteContext['params']) => {
  const projectId = Number(params.projectId);
  if (!Number.isFinite(projectId)) {
    throw new Error('Identificador de proyecto inválido');
  }
  return projectId;
};

const resolveActor = async () => {
  const session = await ensureSession({ mutateCookies: true });
  if (!session) {
    return { response: NextResponse.json({ message: 'No autorizado' }, { status: 401 }) } as const;
  }
  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) {
    await clearSessionCookie();
    return { response: NextResponse.json({ message: 'Sesión inválida' }, { status: 401 }) } as const;
  }
  return { actor } as const;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }
    const initiatives = await listInitiatives(projectId, result.actor);
    return NextResponse.json(initiatives);
  } catch (error) {
    if (error instanceof Error && error.message === 'Identificador de proyecto inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Project not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error('Failed to list initiatives', error);
    return NextResponse.json({ message: 'Error inesperado al listar iniciativas' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }
    const body = await request.json().catch(() => null);
    const initiative = await createInitiative(projectId, body, result.actor);
    revalidatePath(`/projects/${projectId}/initiatives`);
    return NextResponse.json(initiative, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Identificador de proyecto inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Datos inválidos', issues: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
      if (error.message === 'Assigned user is not part of the project') {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (error.message === 'Project not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to create initiative', error);
    return NextResponse.json({ message: 'Error inesperado al crear la iniciativa' }, { status: 500 });
  }
}
