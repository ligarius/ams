import bcrypt from 'bcrypt';
import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import {
  createTemplate,
  createTemplateVersion,
  getTemplate,
  recordTemplateUsage,
  searchTemplates,
} from '@/services/templateService';
import { createProject } from '@/services/projectService';

describe('templateService', () => {
  let admin: User;
  let project: Project;

  const basePayload = {
    name: 'Plantilla de madurez SOX',
    kind: 'PLAYBOOK' as const,
    category: 'Controles Financieros',
    description: 'Metodología para elevar la madurez de controles SOX en 90 días.',
    tags: ['controles', 'madurez', 'SOX'],
    industries: ['Servicios Financieros'],
    maturity: 'FOUNDATIONAL' as const,
    initialVersion: {
      summary: 'Secuencia de trabajo de 6 semanas enfocada en gap analysis y plan de remediación.',
      content:
        'Semana 1: Kickoff y gap analysis\nSemana 2-3: Evaluación de controles\nSemana 4: Diseño de plan\nSemana 5-6: Implementación y seguimiento.',
      changeLog: 'Versión inicial creada para experimentos de Sprint 8.',
      estimatedEffortHours: 120,
      recommendedRoles: ['Director de proyecto', 'Consultor senior'],
      deliverables: ['Mapa de controles', 'Plan de remediación'],
    },
  };

  const createUser = async (email: string, role: User['role']): Promise<User> => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    return prisma.user.create({ data: { email, passwordHash, role } });
  };

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject({ companyId: 1, name: 'Proyecto Inteligencia', wizard: undefined }, admin);
  });

  it('creates templates with searchable metadata and versioning', async () => {
    const template = await createTemplate(basePayload, admin);
    expect(template.versions).toHaveLength(1);
    expect(template.usageCount).toBe(0);

    const searchResults = await searchTemplates({ q: 'controles SOX' }, admin);
    expect(searchResults.find((hit) => hit.id === template.id)).toBeDefined();

    await expect(searchTemplates({ limit: '5' }, admin)).resolves.toBeInstanceOf(Array);

    const newVersion = await createTemplateVersion(
      template.id,
      {
        summary: 'Versión enfocada en automatización y pruebas continuas.',
        content:
          'Agregar evaluación de automatización de controles, tablero de monitoreo y recomendaciones de RPA.',
        changeLog: 'Añadido enfoque de automatización.',
        estimatedEffortHours: 140,
        recommendedRoles: ['Automation lead'],
        deliverables: ['Evaluación de automatización'],
        maturityFocus: 'ADVANCED',
      },
      admin
    );

    expect(newVersion.versionNumber).toBeGreaterThan(1);
    const refreshed = await getTemplate(template.id, admin);
    expect(refreshed.currentVersionNumber).toBe(newVersion.versionNumber);
    expect(refreshed.versions[0].versionNumber).toBe(newVersion.versionNumber);
  });

  it('records template usage and aggregates ratings', async () => {
    const template = await createTemplate(basePayload, admin);
    const before = await getTemplate(template.id, admin);
    expect(before.averageRating).toBeNull();

    const usage = await recordTemplateUsage(
      template.id,
      {
        projectId: project.id,
        rating: 5,
        observedBenefits: ['Reducción del 20% en tiempos de auditoría'],
        notes: 'Excelente alineamiento con controles existentes.',
      },
      admin
    );

    expect(usage.rating).toBe(5);
    const after = await getTemplate(template.id, admin);
    expect(after.usageCount).toBe(before.usageCount + 1);
    expect(after.averageRating).toBe(5);
    expect(after.usageInsights.recentBenefits).toContain('Reducción del 20% en tiempos de auditoría');
  });

  it('prevents clients from curating templates', async () => {
    const client = await createUser('client@example.com', 'CLIENT');
    await expect(createTemplate(basePayload, client)).rejects.toThrow('Insufficient permissions');
  });
});
