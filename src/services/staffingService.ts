import { z } from 'zod';
import prisma, {
  Consultant,
  ConsultantSeniority,
  StaffingAssignment,
  User,
} from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const SENIORITY_VALUES: ConsultantSeniority[] = ['ASSOCIATE', 'CONSULTANT', 'SENIOR', 'MANAGER', 'DIRECTOR'];

const consultantBaseSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  title: z.string().min(2),
  seniority: z.enum(SENIORITY_VALUES),
  practiceArea: z.string().min(2),
  skills: z.array(z.string().min(1)).default([]),
  costRate: z.number().min(0),
  billableRate: z.number().min(0),
  weeklyCapacity: z.number().min(1),
  isActive: z.boolean().optional(),
});

const consultantUpdateSchema = consultantBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'No fields provided for update',
});

const isoDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' })
  .transform((value) => new Date(value));

const assignmentCreateSchema = z.object({
  consultantId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional().nullable(),
  allocation: z.number().min(0).max(1),
  hoursPerWeek: z.number().min(1),
  billable: z.boolean().default(true),
});

const assignmentUpdateSchema = z
  .object({
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional().nullable(),
    allocation: z.number().min(0).max(1).optional(),
    hoursPerWeek: z.number().min(1).optional(),
    billable: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields provided for update',
  });

const DEFAULT_OPEN_ENDED_DURATION_WEEKS = 4;

const isAdmin = (actor: User) => actor.role === 'ADMIN';

const ensureNotClient = (actor: User) => {
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const isAssignmentActive = (assignment: StaffingAssignment, reference: Date) => {
  const starts = assignment.startDate.getTime();
  const ends = assignment.endDate ? assignment.endDate.getTime() : Number.POSITIVE_INFINITY;
  const time = reference.getTime();
  return starts <= time && time <= ends;
};

const calculateDurationWeeks = (assignment: StaffingAssignment) => {
  if (!assignment.endDate) {
    return DEFAULT_OPEN_ENDED_DURATION_WEEKS;
  }
  const start = assignment.startDate.getTime();
  const end = assignment.endDate.getTime();
  const diffMs = Math.max(0, end - start);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.ceil(diffDays / 7));
};

const formatConsultantResponse = (
  consultant: Consultant,
  assignments: Array<{
    assignment: StaffingAssignment;
    projectName: string | null;
    isActive: boolean;
  }>
) => {
  const capacity = consultant.weeklyCapacity;
  const activeAssignments = assignments.filter((entry) => entry.isActive);
  const allocatedHours = activeAssignments.reduce(
    (total, entry) => total + entry.assignment.hoursPerWeek,
    0,
  );
  const billableHours = activeAssignments
    .filter((entry) => entry.assignment.billable)
    .reduce((total, entry) => total + entry.assignment.hoursPerWeek, 0);
  const utilization = capacity > 0 ? Number((allocatedHours / capacity).toFixed(2)) : 0;

  return {
    id: consultant.id,
    name: consultant.name,
    email: consultant.email,
    title: consultant.title,
    seniority: consultant.seniority,
    practiceArea: consultant.practiceArea,
    skills: [...consultant.skills],
    costRate: consultant.costRate,
    billableRate: consultant.billableRate,
    weeklyCapacity: consultant.weeklyCapacity,
    isActive: consultant.isActive,
    createdAt: consultant.createdAt.toISOString(),
    updatedAt: consultant.updatedAt.toISOString(),
    utilization: {
      capacityHours: capacity,
      allocatedHours,
      billableHours,
      utilization,
      assignments: assignments.map(({ assignment, projectName, isActive }) => ({
        id: assignment.id,
        projectId: assignment.projectId,
        projectName,
        allocation: assignment.allocation,
        hoursPerWeek: assignment.hoursPerWeek,
        billable: assignment.billable,
        startDate: assignment.startDate.toISOString(),
        endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
        isActive,
      })),
    },
  };
};

const formatAssignmentResponse = (
  assignment: StaffingAssignment,
  consultant: Consultant,
  projectName: string | null
) => ({
  id: assignment.id,
  consultant: {
    id: consultant.id,
    name: consultant.name,
    title: consultant.title,
    seniority: consultant.seniority,
  },
  projectId: assignment.projectId,
  projectName,
  allocation: assignment.allocation,
  hoursPerWeek: assignment.hoursPerWeek,
  billable: assignment.billable,
  startDate: assignment.startDate.toISOString(),
  endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
  createdAt: assignment.createdAt.toISOString(),
  updatedAt: assignment.updatedAt.toISOString(),
});

export const listConsultants = async (actor: User) => {
  ensureNotClient(actor);
  const [consultants, assignments, projects] = await Promise.all([
    prisma.consultant.findMany(),
    prisma.staffingAssignment.findMany(),
    prisma.project.findMany(),
  ]);
  const projectMap = new Map(projects.map((project) => [project.id, project.name] as const));
  const reference = new Date();

  return consultants.map((consultant) => {
    const consultantAssignments = assignments
      .filter((assignment) => assignment.consultantId === consultant.id)
      .map((assignment) => ({
        assignment,
        projectName: projectMap.get(assignment.projectId) ?? null,
        isActive: isAssignmentActive(assignment, reference),
      }));
    return formatConsultantResponse(consultant, consultantAssignments);
  });
};

export const createConsultant = async (input: unknown, actor: User) => {
  if (!isAdmin(actor)) {
    throw new Error('Insufficient permissions');
  }
  const data = consultantBaseSchema.parse(input);
  const created = await prisma.consultant.create({
    data: {
      name: data.name,
      email: data.email,
      title: data.title,
      seniority: data.seniority,
      practiceArea: data.practiceArea,
      skills: data.skills,
      costRate: data.costRate,
      billableRate: data.billableRate,
      weeklyCapacity: data.weeklyCapacity,
      isActive: data.isActive ?? true,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'CONSULTANT_CREATED',
      metadata: { consultantId: created.id, email: created.email },
    },
  });
  return formatConsultantResponse(created, []);
};

export const updateConsultant = async (consultantId: number, input: unknown, actor: User) => {
  if (!isAdmin(actor)) {
    throw new Error('Insufficient permissions');
  }
  const data = consultantUpdateSchema.parse(input);
  const updated = await prisma.consultant.update({
    where: { id: consultantId },
    data,
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'CONSULTANT_UPDATED',
      metadata: { consultantId: updated.id },
    },
  });
  const assignments = await prisma.staffingAssignment.findMany({ where: { consultantId } });
  const projects = await prisma.project.findMany();
  const projectMap = new Map(projects.map((project) => [project.id, project.name] as const));
  const reference = new Date();
  const mappedAssignments = assignments.map((assignment) => ({
    assignment,
    projectName: projectMap.get(assignment.projectId) ?? null,
    isActive: isAssignmentActive(assignment, reference),
  }));
  return formatConsultantResponse(updated, mappedAssignments);
};

export const listAssignments = async (
  filters: { projectId?: number; consultantId?: number; activeOnly?: boolean },
  actor: User
) => {
  ensureNotClient(actor);
  const assignments = await prisma.staffingAssignment.findMany({ where: filters });
  const [consultants, projects] = await Promise.all([prisma.consultant.findMany(), prisma.project.findMany()]);
  const consultantMap = new Map(consultants.map((consultant) => [consultant.id, consultant] as const));
  const projectMap = new Map(projects.map((project) => [project.id, project.name] as const));

  return assignments.map((assignment) => {
    const consultant = consultantMap.get(assignment.consultantId);
    return formatAssignmentResponse(assignment, consultant!, projectMap.get(assignment.projectId) ?? null);
  });
};

export const createAssignment = async (input: unknown, actor: User) => {
  ensureNotClient(actor);
  const data = assignmentCreateSchema.parse(input);
  const consultant = await prisma.consultant.findUnique({ where: { id: data.consultantId } });
  if (!consultant) {
    throw new Error('Consultant not found');
  }
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
  const created = await prisma.staffingAssignment.create({
    data: {
      consultantId: data.consultantId,
      projectId: data.projectId,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      allocation: data.allocation,
      hoursPerWeek: data.hoursPerWeek,
      billable: data.billable,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'STAFFING_ASSIGNMENT_CREATED',
      metadata: {
        assignmentId: created.id,
        projectId: created.projectId,
        consultantId: created.consultantId,
      },
    },
  });
  return formatAssignmentResponse(created, consultant, project.name);
};

export const updateAssignment = async (assignmentId: number, input: unknown, actor: User) => {
  ensureNotClient(actor);
  const data = assignmentUpdateSchema.parse(input);
  const existing = await prisma.staffingAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing) {
    throw new Error('Staffing assignment not found');
  }
  const updated = await prisma.staffingAssignment.update({
    where: { id: assignmentId },
    data,
  });
  const consultant = await prisma.consultant.findUnique({ where: { id: updated.consultantId } });
  const project = await prisma.project.findUnique({ where: { id: updated.projectId } });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'STAFFING_ASSIGNMENT_UPDATED',
      metadata: { assignmentId: updated.id },
    },
  });
  return formatAssignmentResponse(updated, consultant!, project?.name ?? null);
};

export const getProjectStaffingSummary = async (projectId: number, actor: User) => {
  await ensureProjectAccess(projectId, actor);
  const [assignments, consultants] = await Promise.all([
    prisma.staffingAssignment.findMany({ where: { projectId } }),
    prisma.consultant.findMany(),
  ]);
  const consultantMap = new Map(consultants.map((consultant) => [consultant.id, consultant] as const));

  const team = assignments.map((assignment) => {
    const consultant = consultantMap.get(assignment.consultantId);
    if (!consultant) {
      throw new Error('Consultant not found for assignment');
    }
    const weeks = calculateDurationWeeks(assignment);
    const plannedHours = assignment.hoursPerWeek * weeks;
    const billableHours = assignment.billable ? plannedHours : 0;
    const cost = plannedHours * consultant.costRate;
    const revenue = assignment.billable ? plannedHours * consultant.billableRate : 0;
    return {
      id: assignment.id,
      consultant: {
        id: consultant.id,
        name: consultant.name,
        title: consultant.title,
        seniority: consultant.seniority,
      },
      allocation: assignment.allocation,
      hoursPerWeek: assignment.hoursPerWeek,
      plannedHours,
      billableHours,
      cost,
      revenue,
      startDate: assignment.startDate.toISOString(),
      endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
    };
  });

  const totals = team.reduce(
    (acc, item) => {
      acc.plannedHours += item.plannedHours;
      acc.billableHours += item.billableHours;
      acc.cost += item.cost;
      acc.revenue += item.revenue;
      return acc;
    },
    { plannedHours: 0, billableHours: 0, cost: 0, revenue: 0 }
  );
  const margin = totals.revenue - totals.cost;
  const marginPercent = totals.revenue > 0 ? Number(((margin / totals.revenue) * 100).toFixed(2)) : 0;

  return {
    projectId,
    totals: {
      plannedHours: totals.plannedHours,
      billableHours: totals.billableHours,
      cost: totals.cost,
      revenue: totals.revenue,
      margin,
      marginPercent,
    },
    team,
  };
};
