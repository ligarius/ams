import { z } from 'zod';
import env from '@/config/env';
import prisma, { Approval, ApprovalStatus, SignatureStatus, User } from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';
import signatureProvider, { SignatureEnvelope } from '@/services/signatureProvider';

const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const signerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const approvalCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  documentTemplateId: z.string().min(1),
  signer: signerSchema,
  redirectUrl: z.string().url().optional(),
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

type ApprovalSignatureFields = Pick<
  Approval,
  | 'signatureEnvelopeId'
  | 'signatureDocumentId'
  | 'signatureUrl'
  | 'signatureStatus'
  | 'signatureSentAt'
  | 'signatureCompletedAt'
  | 'signatureDeclinedAt'
>;

type ApprovalSignaturePatch = Partial<ApprovalSignatureFields>;

const sanitizeApprovalForActor = (approval: Approval, actor: User): Approval => {
  if (actor.role === 'CLIENT') {
    return approval;
  }
  return { ...approval, signatureUrl: null };
};

const resolveCallbackUrl = (): string => {
  return `${env.APP_URL.replace(/\/$/, '')}/api/signatures/webhook`;
};

const mapEnvelopeToApprovalPatch = (
  envelope: SignatureEnvelope,
  current: Approval
): ApprovalSignaturePatch => {
  const patch: ApprovalSignaturePatch = {
    signatureEnvelopeId: envelope.envelopeId,
    signatureStatus: envelope.status,
    signatureUrl: envelope.signingUrl ?? current.signatureUrl,
    signatureSentAt: envelope.sentAt ?? current.signatureSentAt,
    signatureCompletedAt: envelope.completedAt ?? current.signatureCompletedAt,
    signatureDeclinedAt: envelope.declinedAt ?? current.signatureDeclinedAt,
  };
  if (envelope.documentId) {
    patch.signatureDocumentId = envelope.documentId;
  }
  return patch;
};

const assertCanMutate = async (projectId: number, actor: User): Promise<void> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

export const listApprovals = async (projectId: number, actor: User): Promise<Approval[]> => {
  await ensureProjectAccess(projectId, actor);
  const approvals = await prisma.approval.findMany({ where: { projectId } });
  return approvals.map((approval) => sanitizeApprovalForActor(approval, actor));
};

export const createApproval = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<Approval> => {
  await assertCanMutate(projectId, actor);
  const data = approvalCreateSchema.parse(payload);
  const callbackUrl = resolveCallbackUrl();

  const envelope = await signatureProvider.createEnvelope({
    title: data.title,
    documentTemplateId: data.documentTemplateId,
    signer: data.signer,
    redirectUrl: data.redirectUrl,
    callbackUrl,
    projectId,
  });
  const approval = await prisma.approval.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      createdById: actor.id,
      signatureEnvelopeId: envelope.envelopeId,
      signatureDocumentId: envelope.documentId ?? null,
      signatureUrl: envelope.signingUrl ?? null,
      signatureStatus: envelope.status,
      signatureSentAt: envelope.sentAt ?? null,
      signatureCompletedAt: envelope.completedAt ?? null,
      signatureDeclinedAt: envelope.declinedAt ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'APPROVAL_CREATED',
      metadata: { projectId, approvalId: approval.id },
    },
  });

  return sanitizeApprovalForActor(approval, actor);
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

  let signaturePatch: ApprovalSignaturePatch = {};
  if (approval.signatureEnvelopeId) {
    try {
      const envelope = await signatureProvider.getEnvelopeStatus(approval.signatureEnvelopeId);
      signaturePatch = mapEnvelopeToApprovalPatch(envelope, approval);
    } catch {
      throw new Error('Unable to refresh signature status');
    }
  }

  const effectiveSignatureStatus: SignatureStatus =
    (signaturePatch.signatureStatus as SignatureStatus | undefined) ?? approval.signatureStatus;

  if (data.status === 'APPROVED' && effectiveSignatureStatus !== 'SIGNED') {
    throw new Error('Cannot approve until the signature is completed');
  }

  if (data.status === 'REJECTED' && !signaturePatch.signatureStatus) {
    signaturePatch = {
      ...signaturePatch,
      signatureStatus: 'REJECTED',
      signatureDeclinedAt: signaturePatch.signatureDeclinedAt ?? new Date(),
    };
  }

  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: data.status,
      decidedById: actor.id,
      decidedAt: new Date(),
      ...signaturePatch,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'APPROVAL_TRANSITIONED',
      metadata: { projectId, approvalId: updated.id, status: updated.status, comment: data.comment },
    },
  });

  return sanitizeApprovalForActor(updated, actor);
};
