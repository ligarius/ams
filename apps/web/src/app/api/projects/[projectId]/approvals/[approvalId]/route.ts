import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { transitionApproval } from '@backend/services/approvalService';

interface RouteContext {
  params: { projectId: string; approvalId: string };
}

const parseProjectId = (params: RouteContext['params']) => {
  const projectId = Number(params.projectId);
  if (!Number.isFinite(projectId)) {
    throw new Error('Identificador de proyecto inválido');
  }
  return projectId;
};

const parseApprovalId = (params: RouteContext['params']) => {
  const approvalId = Number(params.approvalId);
  if (!Number.isFinite(approvalId)) {
    throw new Error('Identificador de aprobación inválido');
  }
  return approvalId;
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
    if (error.message === 'Identificador de aprobación inválido') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.message === 'Insufficient permissions') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === 'Project not found' || error.message === 'Approval not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (
      error.message === 'Invalid status transition' ||
      error.message === 'Cannot approve until the signature is completed' ||
      error.message === 'Unable to refresh signature status'
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }
  return null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const projectId = parseProjectId(context.params);
    const approvalId = parseApprovalId(context.params);
    const result = await resolveActor();
    if ('response' in result) {
      return result.response;
    }

    const payload = await request.json().catch(() => null);
    const updated = await transitionApproval(projectId, approvalId, payload, result.actor);
    revalidatePath('/approvals');
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
    console.error('Failed to transition approval', error);
    return NextResponse.json({ message: 'Error inesperado al actualizar la aprobación' }, { status: 500 });
  }
}
