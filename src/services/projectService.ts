import { z } from 'zod';
import prisma, {
  ChecklistStatus,
  GovernanceCadence,
  GovernanceType,
  PrismaClient,
  Project,
  RiskLevel,
  RiskStatus,
  User,
} from '@/lib/prisma';

const isoDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' })
  .transform((value) => new Date(value));

const riskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

const wizardStakeholderSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
});

const wizardMilestoneSchema = z.object({
  name: z.string().min(2),
  dueDate: isoDateSchema,
});

const wizardRiskSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(1).optional(),
  likelihood: riskLevelSchema,
  impact: riskLevelSchema,
});

const wizardSchema = z
  .object({
    objectives: z.array(z.string().min(3)).optional(),
    stakeholders: z.array(wizardStakeholderSchema).optional(),
    milestones: z.array(wizardMilestoneSchema).optional(),
    risks: z.array(wizardRiskSchema).optional(),
  })
  .optional();

const projectCreateSchema = z.object({
  companyId: z.number().int().positive(),
  name: z.string().min(2),
  description: z.string().min(1).optional(),
  members: z
    .array(
      z.object({
        userId: z.number().int().positive(),
        role: z.enum(['ADMIN', 'CONSULTANT', 'CLIENT']),
      })
    )
    .optional(),
  wizard: wizardSchema,
});

const projectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

type WizardInput = z.infer<typeof wizardSchema>;

type WizardMilestone = {
  name: string;
  dueDate: Date;
};

type WizardRisk = {
  title: string;
  description?: string;
  likelihood: RiskLevel;
  impact: RiskLevel;
};

type WizardStakeholder = {
  name: string;
  role: string;
};

type ResolvedWizardData = {
  objectives: string[];
  milestones: WizardMilestone[];
  risks: WizardRisk[];
  stakeholders: WizardStakeholder[];
};

const addDays = (days: number): Date => {
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
};

const defaultWizardData: ResolvedWizardData = {
  objectives: [
    'Comprender el marco de control y gobierno actual',
    'Evaluar riesgos críticos y madurez de procesos',
    'Definir plan de acción inicial para remediaciones',
  ],
  milestones: [
    { name: 'Kickoff con stakeholders', dueDate: addDays(7) },
    { name: 'Revisión intermedia', dueDate: addDays(21) },
    { name: 'Entrega de informe final', dueDate: addDays(45) },
  ],
  risks: [
    {
      title: 'Retrasos en la entrega de evidencia',
      description: 'Los equipos operativos podrían no cargar documentación a tiempo.',
      likelihood: 'MEDIUM',
      impact: 'HIGH',
    },
    {
      title: 'Cambios de alcance sin control',
      description: 'Solicitudes fuera de gobernanza afectan planificación.',
      likelihood: 'LOW',
      impact: 'MEDIUM',
    },
  ],
  stakeholders: [
    { name: 'María González', role: 'Sponsor ejecutivo' },
    { name: 'Comité de dirección', role: 'Steering Committee' },
    { name: 'Equipo auditor', role: 'Working Group' },
  ],
};

const resolveWizardData = (wizard: WizardInput | undefined): ResolvedWizardData => {
  if (!wizard) {
    return defaultWizardData;
  }

  const ensureItems = <T>(items: T[] | undefined, fallback: T[]): T[] =>
    items && items.length > 0 ? items : fallback;

  return {
    objectives: ensureItems(wizard.objectives, defaultWizardData.objectives),
    milestones: ensureItems(wizard.milestones, defaultWizardData.milestones),
    risks: ensureItems(wizard.risks, defaultWizardData.risks),
    stakeholders: ensureItems(wizard.stakeholders, defaultWizardData.stakeholders),
  };
};

const determineGovernance = (role: string): { type: GovernanceType; cadence: GovernanceCadence } => {
  const normalized = role.toLowerCase();
  if (normalized.includes('sponsor')) {
    return { type: 'SPONSOR_CHECKIN', cadence: 'BIWEEKLY' };
  }
  if (normalized.includes('steering')) {
    return { type: 'STEERING_COMMITTEE', cadence: 'MONTHLY' };
  }
  return { type: 'WORKING_GROUP', cadence: normalized.includes('seman') ? 'WEEKLY' : 'AD_HOC' };
};

const seedProjectStructure = async (
  tx: PrismaClient,
  projectId: number,
  actor: User,
  wizard: ResolvedWizardData
): Promise<void> => {
  const categories = [];
  for (const objective of wizard.objectives) {
    const category = await tx.projectCategory.create({
      data: { projectId, name: objective, description: `Objetivo inicial: ${objective}` },
    });
    categories.push(category);
  }

  for (const [index, risk] of wizard.risks.entries()) {
    const relatedCategory = categories[index % categories.length];
    await tx.projectRisk.create({
      data: {
        projectId,
        categoryId: relatedCategory ? relatedCategory.id : null,
        title: risk.title,
        description: risk.description,
        severity: risk.impact,
        likelihood: risk.likelihood,
        status: 'OPEN',
      },
    });
  }

  for (const milestone of wizard.milestones) {
    await tx.projectChecklist.create({
      data: {
        projectId,
        name: milestone.name,
        dueDate: milestone.dueDate,
        status: 'PENDING',
      },
    });
  }

  const kpis = [
    { name: 'Evidencia recopilada', target: 100, unit: '%', trend: 'STABLE' as const },
    { name: 'Entrevistas completadas', target: 20, unit: 'count', trend: 'STABLE' as const },
    { name: 'Hallazgos mitigados', target: 10, unit: 'count', trend: 'STABLE' as const },
  ];
  for (const kpi of kpis) {
    await tx.projectKpi.create({
      data: {
        projectId,
        name: kpi.name,
        target: kpi.target,
        unit: kpi.unit,
        current: 0,
        trend: kpi.trend,
      },
    });
  }

  const nextMeeting = wizard.milestones[0]?.dueDate ?? null;
  for (const stakeholder of wizard.stakeholders) {
    const governance = determineGovernance(stakeholder.role);
    await tx.governanceEvent.create({
      data: {
        projectId,
        type: governance.type,
        cadence: governance.cadence,
        owner: stakeholder.name,
        name: stakeholder.role,
        nextMeetingAt: nextMeeting,
      },
    });
  }

  await tx.auditLog.create({
    data: {
      userId: actor.id,
      action: 'PROJECT_SEEDED',
      metadata: {
        projectId,
        categories: wizard.objectives.length,
        risks: wizard.risks.length,
        checklists: wizard.milestones.length,
      },
    },
  });
};

export const ensureProjectAccess = async (projectId: number, actor: User): Promise<void> => {
  if (actor.role === 'ADMIN') {
    return;
  }
  const memberships = await prisma.membership.findMany({ where: { projectId, userId: actor.id } });
  if (memberships.length === 0) {
    throw new Error('Insufficient permissions');
  }
};

const severityWeights: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export interface ProjectOverview {
  project: {
    id: number;
    name: string;
    description: string | null;
  };
  kpis: Array<{
    id: number;
    name: string;
    current: number;
    target: number;
    unit: string;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;
  pendingChecklists: Array<{
    id: number;
    name: string;
    dueDate: string | null;
    status: ChecklistStatus;
  }>;
  topRisks: Array<{
    id: number;
    title: string;
    description: string | null;
    severity: RiskLevel;
    likelihood: RiskLevel;
    status: RiskStatus;
  }>;
  governance: Array<{
    id: number;
    type: GovernanceType;
    name: string;
    cadence: GovernanceCadence;
    owner: string;
    nextMeetingAt: string | null;
  }>;
}

export const listProjects = async (user: User): Promise<Project[]> => {
  if (user.role === 'ADMIN') {
    return prisma.project.findMany();
  }
  return prisma.project.findMany({ where: { userId: user.id } });
};

export const createProject = async (payload: unknown, actor: User): Promise<Project> => {
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
  const data = projectCreateSchema.parse(payload);
  const resolvedWizard = resolveWizardData(data.wizard);
  const company = await prisma.company.findUnique({ where: { id: data.companyId } });
  if (!company) {
    throw new Error('Company not found');
  }
  const additionalMembers = (data.members ?? []).filter((member) => member.userId !== actor.id);
  const memberMap = new Map<number, (typeof additionalMembers)[number]>();
  for (const member of additionalMembers) {
    if (!memberMap.has(member.userId)) {
      memberMap.set(member.userId, member);
    }
  }
  for (const userId of memberMap.keys()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`Member with id ${userId} not found`);
    }
  }

  const project = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        description: data.description,
        createdById: actor.id,
      },
    });

    await tx.membership.create({ data: { projectId: createdProject.id, userId: actor.id, role: actor.role } });

    for (const member of memberMap.values()) {
      await tx.membership.create({
        data: { projectId: createdProject.id, userId: member.userId, role: member.role },
      });
    }

    await tx.auditLog.create({
      data: { userId: actor.id, action: 'PROJECT_CREATED', metadata: { projectId: createdProject.id } },
    });

    await seedProjectStructure(tx, createdProject.id, actor, resolvedWizard);

    return createdProject;
  });

  return project;
};

export const updateProject = async (projectId: number, payload: unknown, actor: User): Promise<Project> => {
  const data = projectUpdateSchema.parse(payload);
  const memberships = await prisma.membership.findMany({ where: { projectId, userId: actor.id } });
  if (actor.role !== 'ADMIN' && memberships.length === 0) {
    throw new Error('Insufficient permissions');
  }
  const project = await prisma.project.update({ where: { id: projectId }, data });
  await prisma.auditLog.create({ data: { userId: actor.id, action: 'PROJECT_UPDATED', metadata: { projectId } } });
  return project;
};

export const getProjectOverview = async (projectId: number, actor: User): Promise<ProjectOverview> => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  await ensureProjectAccess(projectId, actor);

  const [kpis, checklists, risks, governance] = await Promise.all([
    prisma.projectKpi.findMany({ where: { projectId } }),
    prisma.projectChecklist.findMany({ where: { projectId } }),
    prisma.projectRisk.findMany({ where: { projectId } }),
    prisma.governanceEvent.findMany({ where: { projectId } }),
  ]);

  const formattedKpis = kpis.map((kpi) => ({
    id: kpi.id,
    name: kpi.name,
    current: kpi.current,
    target: kpi.target,
    unit: kpi.unit,
    trend: kpi.trend,
  }));

  const pendingChecklists = checklists
    .filter((item) => item.status === 'PENDING')
    .sort((a, b) => {
      const aTime = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    }));

  const topRisks = [...risks]
    .sort((a, b) => {
      const severityDiff = severityWeights[b.severity] - severityWeights[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      const likelihoodDiff = severityWeights[b.likelihood] - severityWeights[a.likelihood];
      if (likelihoodDiff !== 0) {
        return likelihoodDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 3)
    .map((risk) => ({
      id: risk.id,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
      likelihood: risk.likelihood,
      status: risk.status,
    }));

  const governanceOverview = governance
    .sort((a, b) => {
      const aTime = a.nextMeetingAt ? a.nextMeetingAt.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.nextMeetingAt ? b.nextMeetingAt.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .map((event) => ({
      id: event.id,
      type: event.type,
      name: event.name,
      cadence: event.cadence,
      owner: event.owner,
      nextMeetingAt: event.nextMeetingAt ? event.nextMeetingAt.toISOString() : null,
    }));

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
    },
    kpis: formattedKpis,
    pendingChecklists,
    topRisks,
    governance: governanceOverview,
  };
};
