import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { createDataRequest, listDataRequests } from '@backend/services/dataRequestService';
import type { DataRequestStatus } from '@backend/lib/prisma';

interface RouteContext {
  params: { projectId: string };
}

const statusQuerySchema = z
  .enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  .optional();

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

const handleKnownError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message === 'Identificador de proyecto inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.message === 'Insufficient permissions') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === 'Project not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
  }
  return null;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }

    let status: DataRequestStatus | undefined;
    const parsedUrl = new URL(request.url);
    const statusParam = parsedUrl.searchParams.get('status');
    if (statusParam) {
      const parsedStatus = statusQuerySchema.safeParse(statusParam as DataRequestStatus);
      if (!parsedStatus.success) {
        return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
      }
      status = parsedStatus.data;
    }

    const requests = await listDataRequests(projectId, result.actor, status);
    return NextResponse.json(requests);
  } catch (error) {
    const response = handleKnownError(error);
    if (response) {
      return response;
    }
    console.error('Failed to list data requests', error);
    return NextResponse.json({ message: 'Error inesperado al listar solicitudes' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }

    const payload = await request.json().catch(() => null);
    const created = await createDataRequest(projectId, payload, result.actor);
    revalidatePath('/requests');
    revalidatePath(`/projects/${projectId}`);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Datos inválidos', issues: error.flatten() }, { status: 400 });
    }
    const response = handleKnownError(error);
    if (response) {
      return response;
    }
    if (error instanceof Error) {
      if (error.message === 'Assigned user is not part of the project') {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to create data request', error);
    return NextResponse.json({ message: 'Error inesperado al crear la solicitud' }, { status: 500 });
  }
}
