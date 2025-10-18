import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { createApproval, listApprovals } from '@backend/services/approvalService';
import type { ApprovalStatus } from '@backend/lib/prisma';

interface RouteContext {
  params: { projectId: string };
}

const statusQuerySchema = z
  .enum(['PENDING', 'APPROVED', 'REJECTED'])
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

    const parsedUrl = new URL(request.url);
    const statusParam = parsedUrl.searchParams.get('status');
    let status: ApprovalStatus | undefined;
    if (statusParam) {
      const parsedStatus = statusQuerySchema.safeParse(statusParam as ApprovalStatus);
      if (!parsedStatus.success) {
        return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
      }
      status = parsedStatus.data;
    }

    const approvals = await listApprovals(projectId, result.actor);
    const filtered = status ? approvals.filter((approval) => approval.status === status) : approvals;
    return NextResponse.json(filtered);
  } catch (error) {
    const response = handleKnownError(error);
    if (response) {
      return response;
    }
    console.error('Failed to list approvals', error);
    return NextResponse.json({ message: 'Error inesperado al listar aprobaciones' }, { status: 500 });
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
    const created = await createApproval(projectId, payload, result.actor);
    revalidatePath('/approvals');
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
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Failed to create approval', error);
    return NextResponse.json({ message: 'Error inesperado al crear la aprobación' }, { status: 500 });
  }
}
