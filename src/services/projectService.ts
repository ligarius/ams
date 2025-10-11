import { z } from 'zod';
import prisma, { Project, User } from '@/lib/prisma';

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
});

const projectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

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
