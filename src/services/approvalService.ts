import { z } from 'zod';
import prisma, { Approval, ApprovalStatus, User } from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const approvalCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

const approvalUpdateSchema = z.object({
  status: approvalStatusSchema,
  comment: z.string().optional(),
});

const allowedTransitions: Record<ApprovalStatus, ApprovalStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const assertCanMutate = async (projectId: number, actor: User): Promise<void> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

export const listApprovals = async (projectId: number, actor: User): Promise<Approval[]> => {
  await ensureProjectAccess(projectId, actor);
  return prisma.approval.findMany({ where: { projectId } });
};

export const createApproval = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<Approval> => {
  await assertCanMutate(projectId, actor);
  const data = approvalCreateSchema.parse(payload);
  const approval = await prisma.approval.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      createdById: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'APPROVAL_CREATED',
      metadata: { projectId, approvalId: approval.id },
    },
  });

  return approval;
};

export const transitionApproval = async (
  projectId: number,
  approvalId: number,
  payload: unknown,
  actor: User
): Promise<Approval> => {
  await assertCanMutate(projectId, actor);
  const data = approvalUpdateSchema.parse(payload);
  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval || approval.projectId !== projectId) {
    throw new Error('Approval not found');
  }

  const allowed = allowedTransitions[approval.status];
  if (!allowed.includes(data.status)) {
    throw new Error('Invalid status transition');
  }

  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: data.status,
      decidedById: actor.id,
      decidedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'APPROVAL_TRANSITIONED',
      metadata: { projectId, approvalId: updated.id, status: updated.status, comment: data.comment },
    },
  });

  return updated;
};
