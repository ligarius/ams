import bcrypt from 'bcrypt';
import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { buildPrioritizationMatrix } from '@/services/prioritizationService';
import {
  listProjectRisks,
  createRisk,
  updateRisk,
  listFindings,
  createFinding,
  updateFinding,
} from '@/services/riskService';

describe('riskService', () => {
  let admin: User;
  let project: Project;

  const createProjectDataRequest = async (projectId: number) =>
    prisma.dataRequest.create({ data: { projectId, title: 'Evidencia clave', createdById: admin.id } });

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject(
      {
        companyId: 1,
        name: 'Programa de cumplimiento',
        description: 'Proyecto base para pruebas',
        wizard: {},
      },
      admin
    );
  });

  it('returns enriched risks with linked findings and data requests', async () => {
    const category = (await prisma.projectCategory.findMany({ where: { projectId: project.id } }))[0];
    expect(category).toBeDefined();
    const dataRequest = await createProjectDataRequest(project.id);
    const createdRisk = await createRisk(
      project.id,
      {
        title: 'Dependencia de terceros',
        likelihood: 'HIGH',
        severity: 'MEDIUM',
        urgency: 'HIGH',
        complexity: 'MEDIUM',
        categoryId: category?.id,
        dataRequestId: dataRequest.id,
        process: 'Gestión de proveedores',
        system: 'ERP',
      },
      admin
    );
    await createFinding(
      project.id,
      {
        riskId: createdRisk.id,
        title: 'Contrato sin cláusulas de SLA',
        description: 'El proveedor crítico no garantiza tiempos de respuesta.',
        dataRequestId: dataRequest.id,
      },
      admin
    );

    const risks = await listProjectRisks(project.id, admin);
    const storedRisk = risks.find((item) => item.id === createdRisk.id);
    expect(storedRisk).toBeDefined();
    expect(storedRisk?.findings).toHaveLength(1);
    expect(storedRisk?.dataRequest?.id).toBe(dataRequest.id);
    expect(storedRisk?.findings[0].dataRequestId).toBe(dataRequest.id);
  });

  it('rejects creating a risk when the category does not belong to the project', async () => {
    const otherProject = await createProject(
      {
        companyId: 1,
        name: 'Proyecto alterno',
        description: 'Otro proyecto para validaciones',
        wizard: {},
      },
      admin
    );
    const foreignCategory = (await prisma.projectCategory.findMany({ where: { projectId: otherProject.id } }))[0];
    expect(foreignCategory).toBeDefined();

    await expect(
      createRisk(
        project.id,
        {
          title: 'Riesgo inválido',
          likelihood: 'LOW',
          severity: 'LOW',
          urgency: 'LOW',
          complexity: 'MEDIUM',
          categoryId: foreignCategory?.id,
        },
        admin
      )
    ).rejects.toThrow('Category not found');
  });

  it('validates data request ownership when creating risks and findings', async () => {
    const otherProject = await createProject(
      {
        companyId: 1,
        name: 'Proyecto aislado',
        description: 'Contexto ajeno',
        wizard: {},
      },
      admin
    );
    const foreignRequest = await createProjectDataRequest(otherProject.id);

    await expect(
      createRisk(
        project.id,
        {
          title: 'Riesgo cruzado',
          likelihood: 'MEDIUM',
          severity: 'HIGH',
          urgency: 'HIGH',
          complexity: 'HIGH',
          dataRequestId: foreignRequest.id,
        },
        admin
      )
    ).rejects.toThrow('Data request not found');

    const risk = await createRisk(
      project.id,
      {
        title: 'Riesgo permitido',
        likelihood: 'LOW',
        severity: 'LOW',
        urgency: 'LOW',
        complexity: 'LOW',
      },
      admin
    );

    await expect(
      createFinding(
        project.id,
        {
          riskId: risk.id,
          title: 'Hallazgo cruzado',
          dataRequestId: foreignRequest.id,
        },
        admin
      )
    ).rejects.toThrow('Data request not found');
  });

  it('prevents client members from mutating risks', async () => {
    const passwordHash = await bcrypt.hash('Client123!', 10);
    const client = await prisma.user.create({ data: { email: 'client@example.com', passwordHash, role: 'CLIENT' } });
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(
      createRisk(
        project.id,
        {
          title: 'Riesgo sin permisos',
          likelihood: 'LOW',
          severity: 'MEDIUM',
          urgency: 'MEDIUM',
          complexity: 'HIGH',
        },
        client
      )
    ).rejects.toThrow('Insufficient permissions');
  });

  it('updates risk fields while preserving unspecified values', async () => {
    const risk = await createRisk(
      project.id,
      {
        title: 'Riesgo operativo',
        likelihood: 'MEDIUM',
        severity: 'HIGH',
        urgency: 'HIGH',
        complexity: 'MEDIUM',
        process: 'Proceso inicial',
        system: 'Sistema legado',
      },
      admin
    );

    const updated = await updateRisk(
      project.id,
      risk.id,
      {
        status: 'IN_PROGRESS',
        process: null,
      },
      admin
    );

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.process).toBeNull();
    expect(updated.system).toBe('Sistema legado');
  });

  it('validates project membership when listing risks', async () => {
    const passwordHash = await bcrypt.hash('Consult123!', 10);
    const outsider = await prisma.user.create({ data: { email: 'outsider@example.com', passwordHash, role: 'CONSULTANT' } });

    await expect(listProjectRisks(project.id, outsider)).rejects.toThrow('Insufficient permissions');
  });

  it('lists findings with linked data requests', async () => {
    const dataRequest = await createProjectDataRequest(project.id);
    const risk = await createRisk(
      project.id,
      {
        title: 'Riesgo de cumplimiento',
        likelihood: 'MEDIUM',
        severity: 'MEDIUM',
        urgency: 'MEDIUM',
        complexity: 'LOW',
      },
      admin
    );

    const finding = await createFinding(
      project.id,
      {
        riskId: risk.id,
        title: 'Hallazgo con evidencia',
        description: 'Se requiere documentación adicional.',
        dataRequestId: dataRequest.id,
      },
      admin
    );

    const findings = await listFindings(project.id, admin);
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe(finding.id);
    expect(findings[0].dataRequest?.id).toBe(dataRequest.id);
  });

  it('validates data request ownership on finding updates', async () => {
    const risk = await createRisk(
      project.id,
      {
        title: 'Riesgo a monitorear',
        likelihood: 'LOW',
        severity: 'MEDIUM',
        urgency: 'MEDIUM',
        complexity: 'MEDIUM',
      },
      admin
    );
    const finding = await createFinding(
      project.id,
      {
        riskId: risk.id,
        title: 'Hallazgo inicial',
      },
      admin
    );
    const otherProject = await createProject(
      {
        companyId: 1,
        name: 'Proyecto remoto',
        description: 'Contexto externo',
        wizard: {},
      },
      admin
    );
    const foreignRequest = await createProjectDataRequest(otherProject.id);

    await expect(
      updateFinding(
        project.id,
        finding.id,
        {
          dataRequestId: foreignRequest.id,
        },
        admin
      )
    ).rejects.toThrow('Data request not found');
  });

  it('prioritizes risks combining impacto, urgencia y complejidad', async () => {
    const highImpact = await createRisk(
      project.id,
      {
        title: 'Controles críticos sin dueño',
        likelihood: 'HIGH',
        severity: 'HIGH',
        urgency: 'HIGH',
        complexity: 'LOW',
      },
      admin
    );

    const complexRisk = await createRisk(
      project.id,
      {
        title: 'Remediación con múltiples dependencias',
        likelihood: 'MEDIUM',
        severity: 'HIGH',
        urgency: 'HIGH',
        complexity: 'HIGH',
      },
      admin
    );

    const risks = await prisma.projectRisk.findMany({ where: { projectId: project.id } });
    const matrix = buildPrioritizationMatrix(risks);

    const rankedHigh = matrix.ordered.find((item) => item.id === highImpact.id);
    const rankedComplex = matrix.ordered.find((item) => item.id === complexRisk.id);

    expect(rankedHigh).toBeDefined();
    expect(rankedComplex).toBeDefined();
    expect(rankedHigh!.score).toBeGreaterThan(rankedComplex!.score);
    expect(rankedHigh!.score).toBeCloseTo(3, 2);
    expect(rankedComplex!.score).toBeCloseTo(2.6, 2);

    const highImpactCell = matrix.matrix.HIGH.HIGH;
    expect(highImpactCell[0]?.id).toBe(highImpact.id);
    expect(highImpactCell.some((item) => item.id === complexRisk.id)).toBe(true);
  });
});
