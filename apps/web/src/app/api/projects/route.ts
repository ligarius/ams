import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession, clearSessionCookie } from '@/lib/auth/session';
import prisma from '@backend/lib/prisma';
import { createProject } from '@backend/services/projectService';

const riskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

const wizardPayloadSchema = z
  .object({
    objectives: z.array(z.string().min(1)).optional(),
    stakeholders: z
      .array(
        z.object({
          name: z.string().min(1),
          role: z.string().min(1),
        })
      )
      .optional(),
    milestones: z
      .array(
        z.object({
          name: z.string().min(1),
          dueDate: z.string().min(1),
        })
      )
      .optional(),
    risks: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
          likelihood: riskLevelSchema,
          impact: riskLevelSchema,
        })
      )
      .optional(),
  })
  .optional();

const projectPayloadSchema = z.object({
  companyId: z.number().int().positive(),
  name: z.string().min(2),
  description: z.string().optional(),
  members: z
    .array(
      z.object({
        userId: z.number().int().positive(),
        role: z.enum(['ADMIN', 'CONSULTANT', 'CLIENT']),
      })
    )
    .optional(),
  wizard: wizardPayloadSchema,
});

export async function POST(request: Request) {
  const session = await ensureSession({ mutateCookies: true });
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = projectPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const project = await createProject(parsed.data, actor);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Datos inválidos', issues: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error) {
      const status = error.message === 'Insufficient permissions' ? 403 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }
    console.error('Failed to create project', error);
    return NextResponse.json({ message: 'Error inesperado al crear el proyecto' }, { status: 500 });
  }
}
