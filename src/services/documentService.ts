import { createHash } from 'node:crypto';
import { z } from 'zod';
import prisma, {
  DocumentCategory,
  DocumentStatus,
  ProjectDocument,
  ProjectDocumentVersion,
  User,
} from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

export type ProjectDocumentSummary = ProjectDocument & {
  latestVersion: ProjectDocumentVersion | null;
};

export type ProjectDocumentDetail = ProjectDocumentSummary & {
  versions: ProjectDocumentVersion[];
};

const documentCategorySchema = z.enum(['EVIDENCE', 'DELIVERABLE', 'POLICY', 'PROCEDURE']);
const documentStatusSchema = z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED']);
const tagsSchema = z.array(z.string().min(1).max(50)).max(10);

const versionInputSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().min(1),
  note: z.string().max(500).optional(),
});

const documentCreateSchema = z
  .object({
    title: z.string().min(3),
    description: z.string().max(2000).optional(),
    category: documentCategorySchema,
    tags: tagsSchema.optional(),
    submitForReview: z.boolean().optional(),
  })
  .merge(versionInputSchema);

const documentUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().max(2000).optional(),
  category: documentCategorySchema.optional(),
  tags: tagsSchema.optional(),
});

const documentVersionCreateSchema = versionInputSchema.extend({
  submitForReview: z.boolean().optional(),
});

const statusTransitionSchema = z.object({
  status: documentStatusSchema,
  note: z.string().max(500).optional(),
});

const sanitizeTags = (tags?: string[]): string[] => {
  if (!tags) {
    return [];
  }
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const rawTag of tags) {
    const tag = rawTag.trim().toLowerCase();
    if (tag.length === 0 || seen.has(tag)) {
      continue;
    }
    normalized.push(tag);
    seen.add(tag);
  }
  return normalized;
};

const computeChecksum = (content: string): string => {
  return createHash('sha256').update(content).digest('hex');
};

const getDocumentOrThrow = async (projectId: number, documentId: number): Promise<ProjectDocument> => {
  const document = await prisma.projectDocument.findUnique({ where: { id: documentId } });
  if (!document || document.projectId !== projectId) {
    throw new Error('Document not found');
  }
  return document;
};

const buildDocumentSummary = async (document: ProjectDocument): Promise<ProjectDocumentSummary> => {
  const latestVersion =
    document.currentVersionId !== null
      ? await prisma.projectDocumentVersion.findUnique({ where: { id: document.currentVersionId } })
      : null;
  return {
    ...document,
    tags: [...document.tags],
    latestVersion: latestVersion ?? null,
  };
};

const buildDocumentDetail = async (document: ProjectDocument): Promise<ProjectDocumentDetail> => {
  const summary = await buildDocumentSummary(document);
  const versions = await prisma.projectDocumentVersion.findMany({ where: { documentId: document.id } });
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return { ...summary, versions: sorted };
};

const assertProjectExists = async (projectId: number): Promise<void> => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
};

const allowedStatusTransitions: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['DRAFT', 'APPROVED'],
  APPROVED: ['IN_REVIEW', 'PUBLISHED'],
  PUBLISHED: ['IN_REVIEW'],
};

const requiresManagerRole = (role: User['role']): boolean => role === 'ADMIN' || role === 'CONSULTANT';

export const listProjectDocuments = async (
  projectId: number,
  actor: User,
  filters?: { status?: DocumentStatus; category?: DocumentCategory }
): Promise<ProjectDocumentSummary[]> => {
  await ensureProjectAccess(projectId, actor);
  const documents = await prisma.projectDocument.findMany({
    where: {
      projectId,
      status: filters?.status,
      category: filters?.category,
    },
  });
  const summaries = await Promise.all(documents.map((document) => buildDocumentSummary(document)));
  return summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const getProjectDocument = async (
  projectId: number,
  documentId: number,
  actor: User
): Promise<ProjectDocumentDetail> => {
  await ensureProjectAccess(projectId, actor);
  const document = await getDocumentOrThrow(projectId, documentId);
  return buildDocumentDetail(document);
};

export const createProjectDocument = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<ProjectDocumentDetail> => {
  await ensureProjectAccess(projectId, actor);
  await assertProjectExists(projectId);
  const data = documentCreateSchema.parse(payload);

  if (actor.role === 'CLIENT' && data.category !== 'EVIDENCE') {
    throw new Error('Clients can only create evidence documents');
  }

  const tags = sanitizeTags(data.tags);
  const checksum = computeChecksum(data.content);

  const document = await prisma.projectDocument.create({
    data: {
      projectId,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      tags,
      createdById: actor.id,
      updatedById: actor.id,
    },
  });

  const version = await prisma.projectDocumentVersion.create({
    data: {
      documentId: document.id,
      fileName: data.fileName,
      content: data.content,
      checksum,
      note: data.note ?? null,
      createdById: actor.id,
    },
  });

  const updatedDocument = await prisma.projectDocument.update({
    where: { id: document.id },
    data: { currentVersionId: version.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DOCUMENT_CREATED',
      metadata: { projectId, documentId: updatedDocument.id, versionId: version.id, category: updatedDocument.category },
    },
  });

  if (data.submitForReview) {
    return transitionDocumentStatus(projectId, updatedDocument.id, { status: 'IN_REVIEW' }, actor);
  }

  return buildDocumentDetail(updatedDocument);
};

export const updateProjectDocument = async (
  projectId: number,
  documentId: number,
  payload: unknown,
  actor: User
): Promise<ProjectDocumentDetail> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
  const data = documentUpdateSchema.parse(payload);
  const document = await getDocumentOrThrow(projectId, documentId);

  const tags = data.tags !== undefined ? sanitizeTags(data.tags) : undefined;

  const updated = await prisma.projectDocument.update({
    where: { id: document.id },
    data: {
      title: data.title,
      description: data.description === undefined ? undefined : data.description ?? null,
      category: data.category,
      tags,
      updatedById: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DOCUMENT_METADATA_UPDATED',
      metadata: { projectId, documentId },
    },
  });

  return buildDocumentDetail(updated);
};

export const addProjectDocumentVersion = async (
  projectId: number,
  documentId: number,
  payload: unknown,
  actor: User
): Promise<ProjectDocumentDetail> => {
  await ensureProjectAccess(projectId, actor);
  const data = documentVersionCreateSchema.parse(payload);
  const document = await getDocumentOrThrow(projectId, documentId);

  const checksum = computeChecksum(data.content);
  if (document.currentVersionId) {
    const latest = await prisma.projectDocumentVersion.findUnique({ where: { id: document.currentVersionId } });
    if (latest && latest.checksum === checksum) {
      throw new Error('No changes detected for new version');
    }
  }

  const version = await prisma.projectDocumentVersion.create({
    data: {
      documentId: document.id,
      fileName: data.fileName,
      content: data.content,
      checksum,
      note: data.note ?? null,
      createdById: actor.id,
    },
  });

  const updated = await prisma.projectDocument.update({
    where: { id: document.id },
    data: { currentVersionId: version.id, status: 'DRAFT', updatedById: actor.id, publishedAt: null },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DOCUMENT_VERSION_ADDED',
      metadata: { projectId, documentId, versionId: version.id, version: version.version },
    },
  });

  if (data.submitForReview) {
    return transitionDocumentStatus(projectId, document.id, { status: 'IN_REVIEW' }, actor);
  }

  return buildDocumentDetail(updated);
};

export const listDocumentVersions = async (
  projectId: number,
  documentId: number,
  actor: User
): Promise<ProjectDocumentVersion[]> => {
  await ensureProjectAccess(projectId, actor);
  await getDocumentOrThrow(projectId, documentId);
  const versions = await prisma.projectDocumentVersion.findMany({ where: { documentId } });
  return [...versions].sort((a, b) => b.version - a.version);
};

export const transitionDocumentStatus = async (
  projectId: number,
  documentId: number,
  payload: unknown,
  actor: User
): Promise<ProjectDocumentDetail> => {
  await ensureProjectAccess(projectId, actor);
  const data = statusTransitionSchema.parse(payload);
  const document = await getDocumentOrThrow(projectId, documentId);

  if (document.status === data.status) {
    throw new Error('Document already has requested status');
  }

  const allowed = allowedStatusTransitions[document.status];
  if (!allowed.includes(data.status)) {
    throw new Error('Invalid status transition');
  }

  if (data.status === 'APPROVED' && !requiresManagerRole(actor.role)) {
    throw new Error('Insufficient permissions');
  }

  if (data.status === 'PUBLISHED' && actor.role !== 'ADMIN') {
    throw new Error('Insufficient permissions');
  }

  if (data.status === 'DRAFT' && !requiresManagerRole(actor.role)) {
    throw new Error('Insufficient permissions');
  }

  if (data.status === 'IN_REVIEW' && document.status !== 'DRAFT' && !requiresManagerRole(actor.role)) {
    throw new Error('Insufficient permissions');
  }

  if ((data.status === 'APPROVED' || data.status === 'PUBLISHED') && document.currentVersionId === null) {
    throw new Error('Document requires a version before approval');
  }

  const patch: Partial<ProjectDocument> & { status: DocumentStatus; updatedById: number } = {
    status: data.status,
    updatedById: actor.id,
  };

  if (data.status === 'PUBLISHED') {
    patch.publishedAt = new Date();
  } else if (document.publishedAt) {
    patch.publishedAt = null;
  }

  const updated = await prisma.projectDocument.update({
    where: { id: document.id },
    data: patch,
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'DOCUMENT_STATUS_CHANGED',
      metadata: {
        projectId,
        documentId,
        from: document.status,
        to: data.status,
        note: data.note ?? null,
      },
    },
  });

  return buildDocumentDetail(updated);
};
