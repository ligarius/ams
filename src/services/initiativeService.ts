import { differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';
import prisma, { Initiative, InitiativeAssignment, InitiativeType, User } from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const initiativeTypeSchema = z.enum(['QUICK_WIN', 'POC', 'PROJECT']);
const initiativeStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']);

const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return value;
}, z.date());

const assignmentSchema = z.object({
  userId: z.number().int().positive(),
  role: z.string().min(3).max(120),
  allocationPercentage: z.number().min(0).max(200),
});

const initiativeCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(1000).optional(),
  type: initiativeTypeSchema,
  status: initiativeStatusSchema.optional(),
  resourceSummary: z.string().min(3),
  startDate: dateSchema,
  endDate: dateSchema,
  estimatedBudget: z.number().min(0).nullable().optional(),
  assignments: z.array(assignmentSchema).default([]),
});

const initiativeUpdateSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().max(1000).nullable().optional(),
    type: initiativeTypeSchema.optional(),
    status: initiativeStatusSchema.optional(),
    resourceSummary: z.string().min(3).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    estimatedBudget: z.number().min(0).nullable().optional(),
    assignments: z.array(assignmentSchema).optional(),
  })
  .refine((data) => !(data.startDate && data.endDate && data.endDate < data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type InitiativeWithAssignments = Initiative & { assignments: InitiativeAssignment[] };

type AssignmentInput = z.infer<typeof assignmentSchema>;

type InitiativePayload = z.infer<typeof initiativeCreateSchema>;

type InitiativeUpdatePayload = z.infer<typeof initiativeUpdateSchema>;

const assertCanMutate = async (projectId: number, actor: User): Promise<void> => {
  await ensureProjectAccess(projectId, actor);
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const ensureAssignmentsMembership = async (projectId: number, assignments: AssignmentInput[]): Promise<void> => {
  if (assignments.length === 0) {
    return;
  }
  const memberships = await prisma.membership.findMany({ where: { projectId } });
  const memberIds = new Set(memberships.map((membership) => membership.userId));
  assignments.forEach((assignment) => {
    if (!memberIds.has(assignment.userId)) {
      throw new Error('Assigned user is not part of the project');
    }
  });
};

const validateSchedule = (startDate: Date, endDate: Date): number => {
  if (endDate < startDate) {
    throw new Error('End date must be on or after start date');
  }
  return differenceInCalendarDays(endDate, startDate) + 1;
};

const validateByType = (
  type: InitiativeType,
  duration: number,
  estimatedBudget: number | null,
  assignments: AssignmentInput[]
) => {
  const totalAllocation = assignments.reduce((total, item) => total + item.allocationPercentage, 0);
  switch (type) {
    case 'QUICK_WIN':
      if (duration > 30) {
        throw new Error('Quick wins must complete within 30 days');
      }
      if (assignments.length > 1) {
        throw new Error('Quick wins must have a single accountable member');
      }
      if (estimatedBudget !== null && estimatedBudget > 5000) {
        throw new Error('Quick wins cannot exceed an estimated budget of 5000');
      }
      break;
    case 'POC':
      if (duration > 90) {
        throw new Error('Proofs of concept cannot exceed 90 days');
      }
      if (estimatedBudget === null || estimatedBudget <= 0) {
        throw new Error('Proofs of concept require a positive estimated budget');
      }
      if (assignments.length === 0) {
        throw new Error('Proofs of concept require at least one assignment');
      }
      break;
    case 'PROJECT':
      if (duration < 60) {
        throw new Error('Projects must cover at least 60 days');
      }
      if (estimatedBudget === null || estimatedBudget < 10000) {
        throw new Error('Projects require an estimated budget of at least 10000');
      }
      if (totalAllocation < 100) {
        throw new Error('Projects must allocate at least 100% of effort across the team');
      }
      break;
    default:
      break;
  }
};

const replaceAssignments = async (initiativeId: number, assignments: AssignmentInput[]): Promise<InitiativeAssignment[]> => {
  await prisma.initiativeAssignment.deleteMany({ where: { initiativeId } });
  if (assignments.length === 0) {
    return [];
  }
  const created: InitiativeAssignment[] = [];
  for (const assignment of assignments) {
    const record = await prisma.initiativeAssignment.create({
      data: {
        initiativeId,
        userId: assignment.userId,
        role: assignment.role,
        allocationPercentage: assignment.allocationPercentage,
      },
    });
    created.push(record);
  }
  return created;
};

const serializeInitiative = async (initiative: Initiative): Promise<InitiativeWithAssignments> => {
  const assignments = await prisma.initiativeAssignment.findMany({ where: { initiativeId: initiative.id } });
  return { ...initiative, assignments };
};

export const listInitiatives = async (projectId: number, actor: User): Promise<InitiativeWithAssignments[]> => {
  await ensureProjectAccess(projectId, actor);
  const initiatives = await prisma.initiative.findMany({ where: { projectId } });
  return Promise.all(initiatives.map((initiative) => serializeInitiative(initiative)));
};

export const getInitiative = async (
  projectId: number,
  initiativeId: number,
  actor: User
): Promise<InitiativeWithAssignments> => {
  await ensureProjectAccess(projectId, actor);
  const initiative = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!initiative || initiative.projectId !== projectId) {
    throw new Error('Initiative not found');
  }
  return serializeInitiative(initiative);
};

export const createInitiative = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<InitiativeWithAssignments> => {
  await assertCanMutate(projectId, actor);
  const data: InitiativePayload = initiativeCreateSchema.parse(payload);
  await ensureAssignmentsMembership(projectId, data.assignments);
  const duration = validateSchedule(data.startDate, data.endDate);
  validateByType(data.type, duration, data.estimatedBudget ?? null, data.assignments);

  const created = await prisma.initiative.create({
    data: {
      projectId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      status: data.status ?? 'PLANNED',
      resourceSummary: data.resourceSummary,
      startDate: data.startDate,
      endDate: data.endDate,
      estimatedBudget: data.estimatedBudget ?? null,
    },
  });

  const assignments = await replaceAssignments(created.id, data.assignments);

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'INITIATIVE_CREATED',
      metadata: { projectId, initiativeId: created.id, type: created.type },
    },
  });

  return { ...created, assignments };
};

export const updateInitiative = async (
  projectId: number,
  initiativeId: number,
  payload: unknown,
  actor: User
): Promise<InitiativeWithAssignments> => {
  await assertCanMutate(projectId, actor);
  const data: InitiativeUpdatePayload = initiativeUpdateSchema.parse(payload);
  const existing = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!existing || existing.projectId !== projectId) {
    throw new Error('Initiative not found');
  }

  const currentAssignments = data.assignments
    ? data.assignments
    : (await prisma.initiativeAssignment.findMany({ where: { initiativeId } })).map((assignment) => ({
        userId: assignment.userId,
        role: assignment.role,
        allocationPercentage: assignment.allocationPercentage,
      }));

  if (data.assignments) {
    await ensureAssignmentsMembership(projectId, data.assignments);
  }

  const nextType = data.type ?? existing.type;
  const nextStartDate = data.startDate ?? existing.startDate;
  const nextEndDate = data.endDate ?? existing.endDate;
  const nextBudget = data.estimatedBudget === undefined ? existing.estimatedBudget : data.estimatedBudget;

  const duration = validateSchedule(nextStartDate, nextEndDate);
  validateByType(nextType, duration, nextBudget ?? null, currentAssignments);

  const updated = await prisma.initiative.update({
    where: { id: initiativeId },
    data: {
      title: data.title,
      description: data.description === undefined ? undefined : data.description,
      type: data.type,
      status: data.status,
      resourceSummary: data.resourceSummary,
      startDate: data.startDate,
      endDate: data.endDate,
      estimatedBudget: data.estimatedBudget === undefined ? undefined : data.estimatedBudget,
    },
  });

  const assignments = data.assignments
    ? await replaceAssignments(updated.id, data.assignments)
    : await prisma.initiativeAssignment.findMany({ where: { initiativeId: updated.id } });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'INITIATIVE_UPDATED',
      metadata: { projectId, initiativeId: updated.id, type: updated.type },
    },
  });

  return { ...updated, assignments };
};

export const deleteInitiative = async (
  projectId: number,
  initiativeId: number,
  actor: User
): Promise<void> => {
  await assertCanMutate(projectId, actor);
  const existing = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!existing || existing.projectId !== projectId) {
    throw new Error('Initiative not found');
  }
  await prisma.initiativeAssignment.deleteMany({ where: { initiativeId } });
  await prisma.initiative.delete({ where: { id: initiativeId } });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'INITIATIVE_DELETED',
      metadata: { projectId, initiativeId },
    },
  });
};
