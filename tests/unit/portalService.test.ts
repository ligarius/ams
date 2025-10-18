import bcrypt from 'bcrypt';
import prisma, {
  Project,
  User,
  resetDatabase,
} from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { getClientPortalSnapshot, type PortalProjectSummary } from '@/services/portalService';

const computeTotalsFor = (projects: PortalProjectSummary[]) => {
  let initiativeTotal = 0;
  let initiativeCompleted = 0;
  let initiativeActive = 0;
  let pendingDataRequests = 0;
  let overdueDataRequests = 0;
  let approvalsPending = 0;
  let findingsOpen = 0;
  const kpiValues: number[] = [];

  for (const project of projects) {
    initiativeTotal += project.progress.initiatives.total;
    initiativeCompleted += project.progress.initiatives.completed;
    initiativeActive += project.progress.initiatives.active;
    pendingDataRequests += project.workload.pendingDataRequests;
    overdueDataRequests += project.workload.overdueDataRequests;
    approvalsPending += project.workload.pendingApprovals;
    findingsOpen += project.workload.openFindings;
    if (project.progress.kpiAchievement !== null) {
      kpiValues.push(project.progress.kpiAchievement);
    }
  }

  return {
    projects: projects.length,
    initiatives: {
      total: initiativeTotal,
      completed: initiativeCompleted,
      active: initiativeActive,
      completionRate: initiativeTotal > 0 ? initiativeCompleted / initiativeTotal : null,
    },
    kpiAchievement: {
      average: kpiValues.length > 0 ? kpiValues.reduce((acc, value) => acc + value, 0) / kpiValues.length : 0,
      sampleSize: kpiValues.length,
    },
    dataRequests: {
      pending: pendingDataRequests,
      overdue: overdueDataRequests,
    },
    approvalsPending,
    findingsOpen,
  };
};

const createUser = async (email: string, role: User['role']): Promise<User> => {
  const passwordHash = await bcrypt.hash('Secret123!', 10);
  return prisma.user.create({ data: { email, passwordHash, role } });
};

describe('portalService', () => {
  let admin: User;
  let projectA: Project;
  let projectB: Project;

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    projectA = await createProject(
      {
        companyId: 1,
        name: 'Proyecto Portal A',
        description: 'Proyecto con actividad para el portal',
      },
      admin
    );
    projectB = await createProject(
      {
        companyId: 1,
        name: 'Proyecto Portal B',
        description: 'Proyecto secundario',
      },
      admin
    );
  });

  it('returns an empty snapshot when the user has no projects', async () => {
    const outsider = await createUser('viewer@example.com', 'CLIENT');

    const snapshot = await getClientPortalSnapshot(outsider);

    expect(snapshot.projects).toHaveLength(0);
    expect(snapshot.totals.projects).toBe(0);
    expect(snapshot.totals.dataRequests.pending).toBe(0);
    expect(snapshot.totals.kpiAchievement.sampleSize).toBe(0);
  });

  it('aggregates portfolio metrics for administrators', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.projectKpi.create({
      data: {
        projectId: projectA.id,
        name: 'Cobertura de hallazgos',
        target: 100,
        current: 80,
        unit: 'percent',
        trend: 'UP',
      },
    });
    await prisma.projectKpi.create({
      data: {
        projectId: projectA.id,
        name: 'Implementación de acciones',
        target: 50,
        current: 50,
        unit: 'percent',
        trend: 'STABLE',
      },
    });
    await prisma.projectKpi.create({
      data: {
        projectId: projectB.id,
        name: 'Madurez de control',
        target: 60,
        current: 30,
        unit: 'percent',
        trend: 'DOWN',
      },
    });

    await prisma.initiative.create({
      data: {
        projectId: projectA.id,
        title: 'Quick win comunicación',
        type: 'QUICK_WIN',
        status: 'COMPLETED',
        resourceSummary: 'Equipo interno',
        startDate: pastDate,
        endDate: pastDate,
      },
    });
    await prisma.initiative.create({
      data: {
        projectId: projectA.id,
        title: 'Implementación PoC',
        type: 'POC',
        status: 'IN_PROGRESS',
        resourceSummary: 'Proveedor externo',
        startDate: pastDate,
        endDate: futureDate,
      },
    });
    await prisma.initiative.create({
      data: {
        projectId: projectB.id,
        title: 'Proyecto estratégico',
        type: 'PROJECT',
        status: 'PLANNED',
        resourceSummary: 'Equipo dedicado',
        startDate: now,
        endDate: futureDate,
      },
    });

    await prisma.dataRequest.create({
      data: {
        projectId: projectA.id,
        title: 'Plan de remediación',
        dueDate: pastDate,
        status: 'PENDING',
        createdById: admin.id,
      },
    });
    await prisma.dataRequest.create({
      data: {
        projectId: projectA.id,
        title: 'Evidencias cerradas',
        dueDate: futureDate,
        status: 'APPROVED',
        createdById: admin.id,
      },
    });

    const riskA = await prisma.projectRisk.create({
      data: {
        projectId: projectA.id,
        title: 'Dependencia tecnológica',
        severity: 'HIGH',
        likelihood: 'MEDIUM',
        urgency: 'HIGH',
        complexity: 'MEDIUM',
      },
    });

    await prisma.finding.create({
      data: {
        projectId: projectA.id,
        riskId: riskA.id,
        title: 'Gap en control de accesos',
        status: 'OPEN',
        createdById: admin.id,
      },
    });

    const riskB = await prisma.projectRisk.create({
      data: {
        projectId: projectB.id,
        title: 'Capacidades insuficientes',
        severity: 'MEDIUM',
        likelihood: 'MEDIUM',
        urgency: 'MEDIUM',
        complexity: 'LOW',
      },
    });

    await prisma.finding.create({
      data: {
        projectId: projectB.id,
        riskId: riskB.id,
        title: 'Hallazgo resuelto',
        status: 'RESOLVED',
        createdById: admin.id,
      },
    });

    await prisma.approval.create({
      data: {
        projectId: projectA.id,
        title: 'Extensión de alcance',
        status: 'PENDING',
        createdById: admin.id,
      },
    });

    await prisma.governanceEvent.create({
      data: {
        projectId: projectA.id,
        type: 'STEERING_COMMITTEE',
        name: 'Comité de dirección',
        cadence: 'MONTHLY',
        owner: 'Sponsor Ejecutivo',
        nextMeetingAt: futureDate,
      },
    });

    const snapshot = await getClientPortalSnapshot(admin);
    const relevantProjects = snapshot.projects.filter((summary) =>
      summary.project.id === projectA.id || summary.project.id === projectB.id
    );

    expect(relevantProjects).toHaveLength(2);

    const projectSummaryA = relevantProjects.find((summary) => summary.project.id === projectA.id)!;
    expect(projectSummaryA.progress.initiatives.total).toBe(2);
    expect(projectSummaryA.progress.initiatives.completed).toBe(1);
    expect(projectSummaryA.progress.kpiAchievement).toBeCloseTo(0.36, 5);
    expect(projectSummaryA.workload.pendingDataRequests).toBe(1);
    expect(projectSummaryA.workload.overdueDataRequests).toBe(1);
    expect(projectSummaryA.workload.pendingApprovals).toBe(1);
    expect(projectSummaryA.workload.openFindings).toBe(1);
    expect(projectSummaryA.alerts.length).toBeGreaterThanOrEqual(3);
    expect(projectSummaryA.status).toBe('OFF_TRACK');
    expect(projectSummaryA.nextGovernanceEvent).not.toBeNull();

    const projectSummaryB = relevantProjects.find((summary) => summary.project.id === projectB.id)!;
    expect(projectSummaryB.progress.initiatives.total).toBe(1);
    expect(projectSummaryB.progress.initiatives.completed).toBe(0);
    expect(projectSummaryB.progress.kpiAchievement).toBeCloseTo(0.125, 5);
    expect(projectSummaryB.status).toBe('OFF_TRACK');

    const relevantTotals = computeTotalsFor(relevantProjects);
    expect(relevantTotals.projects).toBe(2);
    expect(relevantTotals.initiatives.total).toBe(3);
    expect(relevantTotals.initiatives.completed).toBe(1);
    expect(relevantTotals.dataRequests.pending).toBe(1);
    expect(relevantTotals.dataRequests.overdue).toBe(1);
    expect(relevantTotals.approvalsPending).toBe(1);
    expect(relevantTotals.findingsOpen).toBe(1);
    const otherProjects = snapshot.projects.filter(
      (summary) => summary.project.id !== projectA.id && summary.project.id !== projectB.id
    );
    const otherTotals = computeTotalsFor(otherProjects);
    expect(snapshot.totals.projects - otherTotals.projects).toBe(relevantTotals.projects);
    expect(snapshot.totals.initiatives.total - otherTotals.initiatives.total).toBe(relevantTotals.initiatives.total);
    expect(snapshot.totals.initiatives.completed - otherTotals.initiatives.completed).toBe(
      relevantTotals.initiatives.completed
    );
    expect(snapshot.totals.dataRequests.pending - otherTotals.dataRequests.pending).toBe(
      relevantTotals.dataRequests.pending
    );
    expect(snapshot.totals.dataRequests.overdue - otherTotals.dataRequests.overdue).toBe(
      relevantTotals.dataRequests.overdue
    );
    expect(snapshot.totals.approvalsPending - otherTotals.approvalsPending).toBe(relevantTotals.approvalsPending);
    expect(snapshot.totals.findingsOpen - otherTotals.findingsOpen).toBe(relevantTotals.findingsOpen);
    expect(
      snapshot.totals.kpiAchievement.sampleSize - otherTotals.kpiAchievement.sampleSize
    ).toBe(relevantTotals.kpiAchievement.sampleSize);
    const snapshotKpiSum = snapshot.totals.kpiAchievement.average * snapshot.totals.kpiAchievement.sampleSize;
    const otherKpiSum = otherTotals.kpiAchievement.average * otherTotals.kpiAchievement.sampleSize;
    const relevantKpiSum = relevantTotals.kpiAchievement.average * relevantTotals.kpiAchievement.sampleSize;
    expect(snapshotKpiSum - otherKpiSum).toBeCloseTo(relevantKpiSum, 5);
    expect(snapshot.totals.approvalsPending).toBe(otherTotals.approvalsPending + relevantTotals.approvalsPending);
    expect(snapshot.totals.findingsOpen).toBe(otherTotals.findingsOpen + relevantTotals.findingsOpen);
    expect(snapshot.totals.kpiAchievement.sampleSize).toBe(
      otherTotals.kpiAchievement.sampleSize + relevantTotals.kpiAchievement.sampleSize
    );
    const combinedSample = otherTotals.kpiAchievement.sampleSize + relevantTotals.kpiAchievement.sampleSize;
    const combinedAverage = combinedSample
      ? (otherKpiSum + relevantKpiSum) / combinedSample
      : 0;
    expect(snapshot.totals.kpiAchievement.average).toBeCloseTo(combinedAverage, 5);
  });

  it('ignores rejected data requests when computing workloads and alerts', async () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    await prisma.dataRequest.create({
      data: {
        projectId: projectA.id,
        title: 'Rechazada por información incompleta',
        dueDate: pastDate,
        status: 'REJECTED',
        createdById: admin.id,
      },
    });

    const seededKpis = await prisma.projectKpi.findMany({ where: { projectId: projectA.id } });
    for (const kpi of seededKpis) {
      await prisma.projectKpi.create({
        data: {
          projectId: projectA.id,
          name: `${kpi.name} adicional`,
          target: kpi.target,
          current: kpi.target * 2,
          unit: kpi.unit,
          trend: kpi.trend,
        },
      });
    }

    const snapshot = await getClientPortalSnapshot(admin);

    const projectSummary = snapshot.projects.find((summary) => summary.project.id === projectA.id)!;

    expect(projectSummary.workload.pendingDataRequests).toBe(0);
    expect(projectSummary.workload.overdueDataRequests).toBe(0);
    expect(projectSummary.alerts.filter((alert) => alert.type === 'DATA_REQUEST')).toHaveLength(0);
    expect(projectSummary.status).toBe('ON_TRACK');
  });

  it('restricts client users to their memberships', async () => {
    const client = await createUser('client-portal@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: projectA.id, userId: client.id, role: 'CLIENT' } });

    const snapshot = await getClientPortalSnapshot(client);

    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.projects[0].project.id).toBe(projectA.id);
    expect(snapshot.totals.projects).toBe(1);
  });
});
