import { z } from 'zod';
import prisma, { DataRequest, Finding, ProjectRisk, RiskLevel, RiskStatus, User } from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const riskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const riskStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

const riskCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  likelihood: riskLevelSchema,
  severity: riskLevelSchema,
  status: riskStatusSchema.optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  process: z.string().optional(),
  system: z.string().optional(),
  dataRequestId: z.number().int().positive().nullable().optional(),
});

const riskUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  likelihood: riskLevelSchema.optional(),
  severity: riskLevelSchema.optional(),
  status: riskStatusSchema.optional(),
  process: z.string().nullable().optional(),
  system: z.string().nullable().optional(),
  dataRequestId: z.number().int().positive().nullable().optional(),
});

const findingCreateSchema = z.object({
  riskId: z.number().int().positive(),
  dataRequestId: z.number().int().positive().nullable().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
});

const findingUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']).optional(),
  dataRequestId: z.number().int().positive().nullable().optional(),
});

const assertCanMutateRisk = async (projectId: number, actor: User): Promise<void> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const ensureDataRequestBelongsToProject = async (
  projectId: number,
  dataRequestId: number | null | undefined
): Promise<DataRequest | null> => {
  if (!dataRequestId) {
    return null;
  }
  const dataRequest = await prisma.dataRequest.findUnique({ where: { id: dataRequestId } });
  if (!dataRequest || dataRequest.projectId !== projectId) {
    throw new Error('Data request not found');
  }
  return dataRequest;
};

const enrichRisk = async (
  risk: ProjectRisk
): Promise<ProjectRisk & { findings: Finding[]; dataRequest?: DataRequest | null }> => {
  const [findings, dataRequest] = await Promise.all([
    prisma.finding.findMany({ where: { riskId: risk.id } }),
    risk.dataRequestId ? prisma.dataRequest.findUnique({ where: { id: risk.dataRequestId } }) : Promise.resolve(null),
  ]);
  return { ...risk, findings, dataRequest };
};

export const listProjectRisks = async (
  projectId: number,
  actor: User
): Promise<Array<ProjectRisk & { findings: Finding[]; dataRequest?: DataRequest | null }>> => {
  await ensureProjectAccess(projectId, actor);
  const risks = await prisma.projectRisk.findMany({ where: { projectId } });
  return Promise.all(risks.map((risk) => enrichRisk(risk)));
};

export const createRisk = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<ProjectRisk & { findings: Finding[]; dataRequest?: DataRequest | null }> => {
  await assertCanMutateRisk(projectId, actor);
  const data = riskCreateSchema.parse(payload);
  await ensureDataRequestBelongsToProject(projectId, data.dataRequestId ?? undefined);

  if (data.categoryId) {
    const categories = await prisma.projectCategory.findMany({ where: { projectId } });
    if (!categories.some((category) => category.id === data.categoryId)) {
      throw new Error('Category not found');
    }
  }

  const risk = await prisma.projectRisk.create({
    data: {
      projectId,
      categoryId: data.categoryId ?? undefined,
      title: data.title,
      description: data.description,
      likelihood: data.likelihood,
      severity: data.severity,
      status: data.status,
      process: data.process,
      system: data.system,
      dataRequestId: data.dataRequestId ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'RISK_CREATED',
      metadata: { projectId, riskId: risk.id },
    },
  });

  return enrichRisk(risk);
};

export const updateRisk = async (
  projectId: number,
  riskId: number,
  payload: unknown,
  actor: User
): Promise<ProjectRisk & { findings: Finding[]; dataRequest?: DataRequest | null }> => {
  await assertCanMutateRisk(projectId, actor);
  const data = riskUpdateSchema.parse(payload);
  const risk = await prisma.projectRisk.findUnique({ where: { id: riskId } });
  if (!risk || risk.projectId !== projectId) {
    throw new Error('Risk not found');
  }

  await ensureDataRequestBelongsToProject(projectId, data.dataRequestId ?? undefined);

  const updated = await prisma.projectRisk.update({
    where: { id: riskId },
    data: {
      title: data.title,
      description: data.description,
      likelihood: data.likelihood,
      severity: data.severity,
      status: data.status,
      process: data.process === undefined ? undefined : data.process,
      system: data.system === undefined ? undefined : data.system,
      dataRequestId: data.dataRequestId === undefined ? undefined : data.dataRequestId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'RISK_UPDATED',
      metadata: { projectId, riskId: updated.id, status: updated.status },
    },
  });

  return enrichRisk(updated);
};

export const listFindings = async (
  projectId: number,
  actor: User
): Promise<Array<Finding & { dataRequest?: DataRequest | null }>> => {
  await ensureProjectAccess(projectId, actor);
  const findings = await prisma.finding.findMany({ where: { projectId } });
  return Promise.all(
    findings.map(async (finding) => ({
      ...finding,
      dataRequest: finding.dataRequestId
        ? await prisma.dataRequest.findUnique({ where: { id: finding.dataRequestId } })
        : null,
    }))
  );
};

export const createFinding = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<Finding & { dataRequest?: DataRequest | null }> => {
  await assertCanMutateRisk(projectId, actor);
  const data = findingCreateSchema.parse(payload);
  const risk = await prisma.projectRisk.findUnique({ where: { id: data.riskId } });
  if (!risk || risk.projectId !== projectId) {
    throw new Error('Risk not found');
  }

  await ensureDataRequestBelongsToProject(projectId, data.dataRequestId ?? undefined);

  const finding = await prisma.finding.create({
    data: {
      projectId,
      riskId: data.riskId,
      dataRequestId: data.dataRequestId ?? undefined,
      title: data.title,
      description: data.description,
      createdById: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'FINDING_CREATED',
      metadata: { projectId, riskId: data.riskId, findingId: finding.id },
    },
  });

  return {
    ...finding,
    dataRequest: finding.dataRequestId
      ? await prisma.dataRequest.findUnique({ where: { id: finding.dataRequestId } })
      : null,
  };
};

export const updateFinding = async (
  projectId: number,
  findingId: number,
  payload: unknown,
  actor: User
): Promise<Finding & { dataRequest?: DataRequest | null }> => {
  await assertCanMutateRisk(projectId, actor);
  const data = findingUpdateSchema.parse(payload);
  const existing = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!existing || existing.projectId !== projectId) {
    throw new Error('Finding not found');
  }

  await ensureDataRequestBelongsToProject(projectId, data.dataRequestId ?? undefined);

  const updated = await prisma.finding.update({
    where: { id: findingId },
    data: {
      title: data.title,
      description: data.description,
      status: data.status,
      dataRequestId: data.dataRequestId === undefined ? undefined : data.dataRequestId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'FINDING_UPDATED',
      metadata: { projectId, findingId: updated.id, status: updated.status },
    },
  });

  return {
    ...updated,
    dataRequest: updated.dataRequestId
      ? await prisma.dataRequest.findUnique({ where: { id: updated.dataRequestId } })
      : null,
  };
};
