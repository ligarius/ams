import bcrypt from 'bcrypt';
import prisma, {
  Project,
  User,
  resetDatabase,
} from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { getClientPortalSnapshot } from '@/services/portalService';

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

    expect(snapshot.projects).toHaveLength(2);
    expect(snapshot.projects[0].project.name).toBe('Proyecto Portal A');

    const projectSummaryA = snapshot.projects.find((summary) => summary.project.id === projectA.id)!;
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

    const projectSummaryB = snapshot.projects.find((summary) => summary.project.id === projectB.id)!;
    expect(projectSummaryB.progress.initiatives.total).toBe(1);
    expect(projectSummaryB.progress.initiatives.completed).toBe(0);
    expect(projectSummaryB.progress.kpiAchievement).toBeCloseTo(0.125, 5);
    expect(projectSummaryB.status).toBe('OFF_TRACK');

    expect(snapshot.totals.projects).toBe(2);
    expect(snapshot.totals.initiatives.total).toBe(3);
    expect(snapshot.totals.initiatives.completed).toBe(1);
    expect(snapshot.totals.dataRequests.pending).toBe(1);
    expect(snapshot.totals.dataRequests.overdue).toBe(1);
    expect(snapshot.totals.approvalsPending).toBe(1);
    expect(snapshot.totals.findingsOpen).toBe(1);
    expect(snapshot.totals.kpiAchievement.sampleSize).toBe(2);
    expect(snapshot.totals.kpiAchievement.average).toBeCloseTo(0.2425, 5);
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
