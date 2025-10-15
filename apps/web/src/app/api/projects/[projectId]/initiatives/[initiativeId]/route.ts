import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { deleteInitiative, getInitiative, updateInitiative } from '@backend/services/initiativeService';

interface RouteContext {
  params: { projectId: string; initiativeId: string };
}

const parseParams = (params: RouteContext['params']) => {
  const projectId = Number(params.projectId);
  const initiativeId = Number(params.initiativeId);
  if (!Number.isFinite(projectId) || !Number.isFinite(initiativeId)) {
    throw new Error('Identificador inválido');
  }
  return { projectId, initiativeId };
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
    const { projectId, initiativeId } = parseParams(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }
    const initiative = await getInitiative(projectId, initiativeId, result.actor);
    return NextResponse.json(initiative);
  } catch (error) {
    if (error instanceof Error && error.message === 'Identificador inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Initiative not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error('Failed to fetch initiative', error);
    return NextResponse.json({ message: 'Error inesperado al obtener la iniciativa' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, initiativeId } = parseParams(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }
    const body = await request.json().catch(() => null);
    const initiative = await updateInitiative(projectId, initiativeId, body, result.actor);
    revalidatePath(`/projects/${projectId}/initiatives/${initiativeId}`);
    revalidatePath(`/projects/${projectId}/initiatives`);
    return NextResponse.json(initiative);
  } catch (error) {
    if (error instanceof Error && error.message === 'Identificador inválido') {
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
      if (error.message === 'Initiative not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to update initiative', error);
    return NextResponse.json({ message: 'Error inesperado al actualizar la iniciativa' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { projectId, initiativeId } = parseParams(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }
    await deleteInitiative(projectId, initiativeId, result.actor);
    revalidatePath(`/projects/${projectId}/initiatives`);
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Identificador inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
      if (error.message === 'Initiative not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to delete initiative', error);
    return NextResponse.json({ message: 'Error inesperado al eliminar la iniciativa' }, { status: 500 });
  }
}
