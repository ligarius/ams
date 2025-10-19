import bcrypt from 'bcrypt';
import prisma, {
  Project,
  User,
  resetDatabase,
} from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import {
  generateBenchmarkReport,
  getBenchmarkLeaderboard,
  getBenchmarkTrend,
  listBenchmarkSnapshots,
  recordBenchmarkFeedback,
} from '@/services/benchmarkService';

const seedUser = async (email: string, role: User['role']): Promise<User> => {
  const passwordHash = await bcrypt.hash('Secret123!', 10);
  return prisma.user.create({ data: { email, passwordHash, role } });
};

describe('benchmarkService', () => {
  let admin: User;
  let project: Project;

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject({ companyId: 1, name: 'Benchmark Project', wizard: undefined }, admin);
  });

  const seedSignals = async () => {
    const risk = await prisma.projectRisk.create({
      data: {
        projectId: project.id,
        title: 'Riesgo operativo alto',
        severity: 'HIGH',
        likelihood: 'HIGH',
        urgency: 'MEDIUM',
        complexity: 'MEDIUM',
        status: 'OPEN',
      },
    });

    const dataRequest = await prisma.dataRequest.create({
      data: {
        projectId: project.id,
        title: 'Solicitar evidencia',
        status: 'PENDING',
        createdById: admin.id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await prisma.dataRequest.update({
      where: { id: dataRequest.id },
      data: { status: 'APPROVED' },
    });

    const finding = await prisma.finding.create({
      data: {
        projectId: project.id,
        riskId: risk.id,
        dataRequestId: null,
        title: 'Hallazgo pendiente',
        status: 'OPEN',
        createdById: admin.id,
      },
    });

    await prisma.finding.update({
      where: { id: finding.id },
      data: { status: 'RESOLVED' },
    });

    await prisma.templateUsage.create({
      data: {
        templateId: 1,
        projectId: project.id,
        usedById: admin.id,
        rating: 5,
        notes: 'Generó gran valor',
        observedBenefits: ['Redujo tiempos de análisis'],
      },
    });

    const consultant = await seedUser('consultant-benchmark@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });
    await prisma.staffingAssignment.create({
      data: {
        projectId: project.id,
        consultantId: consultant.id,
        startDate: new Date(),
        endDate: null,
        allocation: 0.6,
        hoursPerWeek: 24,
        billable: true,
      },
    });
  };

  it('generates benchmark reports, persists snapshots and returns insights', async () => {
    await seedSignals();
    const secondaryProject = await createProject({ companyId: 1, name: 'Portfolio Baseline', wizard: undefined }, admin);
    await prisma.projectRisk.create({
      data: {
        projectId: secondaryProject.id,
        title: 'Riesgo moderado',
        severity: 'MEDIUM',
        likelihood: 'MEDIUM',
        urgency: 'LOW',
        complexity: 'LOW',
        status: 'OPEN',
      },
    });

    const report = await generateBenchmarkReport(project.id, admin);
    expect(report.project.id).toBe(project.id);
    expect(report.metrics.riskScore).toBeGreaterThan(0);
    expect(report.portfolio.medianRiskScore).toBeGreaterThanOrEqual(0);
    expect(report.insights.length).toBeGreaterThan(0);

    const snapshots = await listBenchmarkSnapshots(project.id, admin, { limit: 5 });
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].insights.length).toBe(report.insights.length);
  });

  it('records feedback with validation', async () => {
    await seedSignals();
    await generateBenchmarkReport(project.id, admin);
    const feedback = await recordBenchmarkFeedback(
      project.id,
      { usefulness: 5, confidence: 4, comment: 'Información muy accionable' },
      admin
    );
    expect(feedback.usefulness).toBe(5);
    expect(feedback.comment).toContain('accionable');

    await expect(
      recordBenchmarkFeedback(project.id, { usefulness: 0, confidence: 3, comment: 'comentario' }, admin)
    ).rejects.toThrow(/expected number to be >=1/);
  });

  it('builds benchmark trend analytics with momentum scoring', async () => {
    await seedSignals();
    await generateBenchmarkReport(project.id, admin);

    await prisma.dataRequest.create({
      data: {
        projectId: project.id,
        title: 'Nueva solicitud de evidencia',
        status: 'PENDING',
        createdById: admin.id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      },
    });

    await prisma.projectRisk.create({
      data: {
        projectId: project.id,
        title: 'Nuevo riesgo operativo',
        severity: 'MEDIUM',
        likelihood: 'MEDIUM',
        urgency: 'HIGH',
        complexity: 'LOW',
        status: 'OPEN',
      },
    });

    await generateBenchmarkReport(project.id, admin);

    const trend = await getBenchmarkTrend(project.id, admin, { limit: 5 });
    expect(trend.series.length).toBeGreaterThanOrEqual(2);
    expect(trend.window.totalSnapshots).toBeGreaterThanOrEqual(2);
    const pendingMetric = trend.metrics.find((metric) => metric.key === 'pendingDataRequests');
    expect(pendingMetric).toBeDefined();
    expect(pendingMetric?.latest).toBeGreaterThan(0);
    expect(trend.momentum.improving + trend.momentum.declining).toBeGreaterThanOrEqual(0);
  });

  it('produces benchmark leaderboards restricted to consultants and admins', async () => {
    await seedSignals();
    await generateBenchmarkReport(project.id, admin);

    const secondaryProject = await createProject({ companyId: 1, name: 'Second Benchmark', wizard: undefined }, admin);
    await generateBenchmarkReport(secondaryProject.id, admin);

    const leaderboard = await getBenchmarkLeaderboard({ metric: 'remediationRate', limit: 10 }, admin);
    expect(leaderboard.metric.key).toBe('remediationRate');
    expect(leaderboard.entries.length).toBeGreaterThanOrEqual(2);
    expect(leaderboard.entries[0].rank).toBe(1);

    const client = await seedUser('client-benchmark@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(getBenchmarkLeaderboard({ metric: 'riskScore' }, client)).rejects.toThrow('Insufficient permissions');
  });
});
