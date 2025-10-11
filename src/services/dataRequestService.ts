import { z } from 'zod';
import prisma, { DataRequestStatus, DataRequest, DataRequestAttachment, User } from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const isoDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' })
  .transform((value) => new Date(value));

const dataRequestStatusSchema = z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']);

const dataRequestCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: isoDateSchema.optional(),
  assignedToId: z.number().int().positive().optional(),
});

const dataRequestUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  dueDate: isoDateSchema.nullable().optional(),
  status: dataRequestStatusSchema.optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
});

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().min(1),
});

const allowedTransitions: Record<DataRequestStatus, DataRequestStatus[]> = {
  PENDING: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const assertCanMutate = async (projectId: number, actor: User): Promise<void> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const formatDataRequest = async (request: DataRequest): Promise<DataRequest & { attachments: DataRequestAttachment[] }> => {
  const attachments = await prisma.dataRequestAttachment.findMany({ where: { dataRequestId: request.id } });
  return { ...request, attachments };
};

export const listDataRequests = async (
  projectId: number,
  actor: User,
  status?: DataRequestStatus
): Promise<Array<DataRequest & { attachments: DataRequestAttachment[] }>> => {
  await ensureProjectAccess(projectId, actor);
  const requests = await prisma.dataRequest.findMany({ where: { projectId, status } });
  const withAttachments = await Promise.all(requests.map((request) => formatDataRequest(request)));
  return withAttachments;
};

export const createDataRequest = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<DataRequest & { attachments: DataRequestAttachment[] }> => {
  await assertCanMutate(projectId, actor);
  const data = dataRequestCreateSchema.parse(payload);

  if (data.assignedToId) {
    const membership = await prisma.membership.findMany({ where: { projectId, userId: data.assignedToId } });
    if (membership.length === 0) {
      throw new Error('Assigned user is not part of the project');
    }
  }

  const created = await prisma.dataRequest.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      createdById: actor.id,
      assignedToId: data.assignedToId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DATA_REQUEST_CREATED',
      metadata: { projectId, dataRequestId: created.id },
    },
  });

  return formatDataRequest(created);
};

export const updateDataRequest = async (
  projectId: number,
  dataRequestId: number,
  payload: unknown,
  actor: User
): Promise<DataRequest & { attachments: DataRequestAttachment[] }> => {
  await ensureProjectAccess(projectId, actor);
  const data = dataRequestUpdateSchema.parse(payload);
  const existing = await prisma.dataRequest.findUnique({ where: { id: dataRequestId } });

  if (!existing || existing.projectId !== projectId) {
    throw new Error('Data request not found');
  }

  if (actor.role === 'CLIENT') {
    const hasForbiddenField =
      data.title !== undefined ||
      data.description !== undefined ||
      data.dueDate !== undefined ||
      data.assignedToId !== undefined;
    if (hasForbiddenField) {
      throw new Error('Insufficient permissions');
    }
  }

  if (data.status && data.status !== existing.status) {
    const allowed = allowedTransitions[existing.status];
    if (!allowed.includes(data.status)) {
      throw new Error('Invalid status transition');
    }
    if ((data.status === 'APPROVED' || data.status === 'REJECTED') && actor.role === 'CLIENT') {
      throw new Error('Insufficient permissions');
    }
    if (data.status === 'IN_REVIEW' && actor.role === 'CONSULTANT' && existing.createdById === actor.id) {
      // consultants can transition their own requests, nothing extra
    }
  }

  if (data.assignedToId !== undefined && data.assignedToId !== null) {
    const membership = await prisma.membership.findMany({ where: { projectId, userId: data.assignedToId } });
    if (membership.length === 0) {
      throw new Error('Assigned user is not part of the project');
    }
  }

  const updated = await prisma.dataRequest.update({
    where: { id: dataRequestId },
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate,
      status: data.status,
      assignedToId: data.assignedToId === undefined ? undefined : data.assignedToId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DATA_REQUEST_UPDATED',
      metadata: { projectId, dataRequestId: updated.id, status: updated.status },
    },
  });

  return formatDataRequest(updated);
};

export const addDataRequestAttachment = async (
  projectId: number,
  dataRequestId: number,
  payload: unknown,
  actor: User
): Promise<DataRequestAttachment> => {
  await ensureProjectAccess(projectId, actor);
  const data = attachmentSchema.parse(payload);
  const existing = await prisma.dataRequest.findUnique({ where: { id: dataRequestId } });

  if (!existing || existing.projectId !== projectId) {
    throw new Error('Data request not found');
  }

  const attachment = await prisma.dataRequestAttachment.create({
    data: {
      dataRequestId,
      fileName: data.fileName,
      content: data.content,
      uploadedById: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DATA_REQUEST_ATTACHMENT_ADDED',
      metadata: { projectId, dataRequestId },
    },
  });

  return attachment;
};

export const listDataRequestAttachments = async (
  projectId: number,
  dataRequestId: number,
  actor: User
): Promise<DataRequestAttachment[]> => {
  await ensureProjectAccess(projectId, actor);
  const existing = await prisma.dataRequest.findUnique({ where: { id: dataRequestId } });
  if (!existing || existing.projectId !== projectId) {
    throw new Error('Data request not found');
  }
  return prisma.dataRequestAttachment.findMany({ where: { dataRequestId } });
};
