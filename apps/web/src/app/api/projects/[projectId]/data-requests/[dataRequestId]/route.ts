import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { updateDataRequest } from '@backend/services/dataRequestService';

interface RouteContext {
  params: { projectId: string; dataRequestId: string };
}

const parseProjectId = (params: RouteContext['params']) => {
  const projectId = Number(params.projectId);
  if (!Number.isFinite(projectId)) {
    throw new Error('Identificador de proyecto inválido');
  }
  return projectId;
};

const parseDataRequestId = (params: RouteContext['params']) => {
  const dataRequestId = Number(params.dataRequestId);
  if (!Number.isFinite(dataRequestId)) {
    throw new Error('Identificador de solicitud inválido');
  }
  return dataRequestId;
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

const handleKnownError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message === 'Identificador de proyecto inválido' || error.message === 'Identificador de solicitud inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.message === 'Insufficient permissions') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === 'Project not found' || error.message === 'Data request not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.message === 'Invalid status transition') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }
  return null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const dataRequestId = parseDataRequestId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }

    const payload = await request.json().catch(() => null);
    const updated = await updateDataRequest(projectId, dataRequestId, payload, result.actor);
    revalidatePath('/requests');
    revalidatePath(`/projects/${projectId}`);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Datos inválidos', issues: error.flatten() }, { status: 400 });
    }
    const response = handleKnownError(error);
    if (response) {
      return response;
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to update data request', error);
    return NextResponse.json({ message: 'Error inesperado al actualizar la solicitud' }, { status: 500 });
  }
}
