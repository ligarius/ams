import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { recordTemplateUsage } from '@/services/templateService';
import { generateProjectRecommendations } from '@/services/recommendationService';

describe('recommendationService', () => {
  let admin: User;
  let project: Project;

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject({ companyId: 1, name: 'Proyecto Recomendaciones', wizard: undefined }, admin);
  });

  const seedOperationalSignals = async () => {
    const risk = await prisma.projectRisk.create({
      data: {
        projectId: project.id,
        title: 'Riesgo crítico de segregación de funciones',
        severity: 'HIGH',
        likelihood: 'MEDIUM',
        urgency: 'HIGH',
        complexity: 'MEDIUM',
      },
    });

    await prisma.finding.create({
      data: {
        projectId: project.id,
        riskId: risk.id,
        dataRequestId: null,
        title: 'Hallazgo pendiente de remediación',
        status: 'OPEN',
        description: 'Falta de evidencia para mitigaciones clave',
        createdById: admin.id,
      },
    });

    await prisma.dataRequest.create({
      data: {
        projectId: project.id,
        title: 'Estados financieros Q1',
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        status: 'IN_REVIEW',
        createdById: admin.id,
      },
    });

    await prisma.projectChecklist.create({
      data: {
        projectId: project.id,
        name: 'Checklist de control interno',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        status: 'PENDING',
      },
    });

    await prisma.approval.create({
      data: {
        projectId: project.id,
        title: 'Cambio de alcance sprint',
        description: 'Solicita incluir revisión de procesos adicionales',
        status: 'PENDING',
        createdById: admin.id,
      },
    });

    const template = (await prisma.template.findMany())[0];
    await recordTemplateUsage(template.id, { projectId: project.id, rating: 4 }, admin);
  };

  it('builds blended recommendations based on project signals', async () => {
    await seedOperationalSignals();

    const summary = await generateProjectRecommendations(project.id, admin);
    expect(summary.project.id).toBe(project.id);
    expect(summary.metrics.highRiskCount).toBeGreaterThan(0);
    expect(summary.metrics.pendingDataRequests).toBeGreaterThan(0);
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.connectors.length).toBeGreaterThan(0);

    const riskRecommendation = summary.recommendations.find((item) => item.id === 'risk-mitigation-playbook');
    expect(riskRecommendation).toBeDefined();
    expect(riskRecommendation?.score).toBeGreaterThan(0);
    expect(riskRecommendation?.suggestedTemplates.length).toBeGreaterThan(0);
  });
});
