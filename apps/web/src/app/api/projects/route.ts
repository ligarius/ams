import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSession } from '@/lib/auth/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

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

  const body = await request.json().catch(() => null);
  const parsed = projectPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorBody?.message ?? 'No se pudo crear el proyecto' },
        { status: response.status }
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error('Failed to create project', error);
    return NextResponse.json({ message: 'Error inesperado al crear el proyecto' }, { status: 500 });
  }
}
