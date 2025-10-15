import bcrypt from 'bcrypt';
import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import {
  createInitiative,
  deleteInitiative,
  listInitiatives,
  updateInitiative,
} from '@/services/initiativeService';

describe('initiativeService', () => {
  let admin: User;
  let project: Project;

  const createUser = async (email: string, role: User['role']): Promise<User> => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    return prisma.user.create({ data: { email, passwordHash, role } });
  };

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject(
      {
        companyId: 1,
        name: 'Auditoría de iniciativas',
      },
      admin
    );
  });

  it('rejects creation by clients even if they belong to the project', async () => {
    const client = await createUser('client@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(
      createInitiative(
        project.id,
        {
          title: 'Quick win comunicación',
          type: 'QUICK_WIN',
          resourceSummary: '1 consultor senior 20%',
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-15').toISOString(),
        },
        client
      )
    ).rejects.toThrow('Insufficient permissions');
  });

  it('enforces quick win duration and ownership rules', async () => {
    const consultant = await createUser('consultant@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });

    await expect(
      createInitiative(
        project.id,
        {
          title: 'Quick win extendido',
          type: 'QUICK_WIN',
          resourceSummary: 'Equipo dedicado',
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-02-15').toISOString(),
        },
        admin
      )
    ).rejects.toThrow('Quick wins must complete within 30 days');

    await expect(
      createInitiative(
        project.id,
        {
          title: 'Quick win con dos responsables',
          type: 'QUICK_WIN',
          resourceSummary: 'Dedicación conjunta',
          startDate: new Date('2024-03-01').toISOString(),
          endDate: new Date('2024-03-20').toISOString(),
          assignments: [
            { userId: admin.id, role: 'Líder', allocationPercentage: 50 },
            { userId: consultant.id, role: 'Soporte', allocationPercentage: 50 },
          ],
        },
        admin
      )
    ).rejects.toThrow('Quick wins must have a single accountable member');
  });

  it('validates assignment membership for proofs of concept', async () => {
    const outsider = await createUser('outsider@example.com', 'CONSULTANT');

    await expect(
      createInitiative(
        project.id,
        {
          title: 'PoC de seguridad',
          type: 'POC',
          resourceSummary: 'Infraestructura mínima',
          startDate: new Date('2024-04-01').toISOString(),
          endDate: new Date('2024-04-20').toISOString(),
          estimatedBudget: 25000,
          assignments: [{ userId: outsider.id, role: 'Responsable técnico', allocationPercentage: 80 }],
        },
        admin
      )
    ).rejects.toThrow('Assigned user is not part of the project');
  });

  it('creates, lists and updates initiatives enforcing project rules', async () => {
    const consultant = await createUser('delivery@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });

    const initiative = await createInitiative(
      project.id,
      {
        title: 'Programa de transformación',
        type: 'PROJECT',
        resourceSummary: 'Equipo dedicado de 4 consultores',
        startDate: new Date('2024-05-01').toISOString(),
        endDate: new Date('2024-09-01').toISOString(),
        estimatedBudget: 150000,
        assignments: [
          { userId: admin.id, role: 'Director del proyecto', allocationPercentage: 40 },
          { userId: consultant.id, role: 'Consultor líder', allocationPercentage: 70 },
        ],
      },
      admin
    );

    const initiatives = await listInitiatives(project.id, admin);
    expect(initiatives).toHaveLength(1);
    expect(initiatives[0].assignments).toHaveLength(2);

    await expect(
      updateInitiative(
        project.id,
        initiative.id,
        {
          estimatedBudget: 5000,
        },
        admin
      )
    ).rejects.toThrow('Projects require an estimated budget of at least 10000');

    const updated = await updateInitiative(
      project.id,
      initiative.id,
      {
        status: 'IN_PROGRESS',
        assignments: [
          { userId: admin.id, role: 'Director del proyecto', allocationPercentage: 60 },
          { userId: consultant.id, role: 'Consultor líder', allocationPercentage: 60 },
        ],
      },
      admin
    );

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.assignments).toHaveLength(2);
    expect(updated.assignments[0].allocationPercentage + updated.assignments[1].allocationPercentage).toBe(120);

    await deleteInitiative(project.id, initiative.id, admin);
    const afterDeletion = await listInitiatives(project.id, admin);
    expect(afterDeletion).toHaveLength(0);
  });
});
