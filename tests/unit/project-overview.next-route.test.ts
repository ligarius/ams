import { GET } from '../../apps/web/src/app/api/projects/[projectId]/overview/route';
import prisma, { resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import type { ProjectOverview } from '@/services/projectService';
import { ensureSession, clearSessionCookie } from '../../apps/web/src/lib/auth/session';

jest.mock('../../apps/web/src/lib/auth/session', () => ({
  ensureSession: jest.fn(),
  clearSessionCookie: jest.fn(),
}));

const ensureSessionMock = ensureSession as jest.MockedFunction<typeof ensureSession>;
const clearSessionCookieMock = clearSessionCookie as jest.MockedFunction<typeof clearSessionCookie>;

describe('apps/web project overview API route', () => {
  beforeEach(() => {
    resetDatabase();
    jest.resetAllMocks();
  });

  it('returns the project overview after creating a project', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    const project = await createProject({ companyId: 1, name: 'Next Overview Project' }, admin!);

    ensureSessionMock.mockResolvedValue({ user: { id: admin!.id } } as any);

    const response = await GET(new Request('http://localhost/api/projects/overview'), {
      params: { projectId: String(project.id) },
    });

    const result = response as unknown as { body: ProjectOverview; status: number };

    expect(result.status).toBe(200);
    expect(result.body.project.id).toBe(project.id);
    expect(result.body.project.name).toBe('Next Overview Project');
    expect(Array.isArray(result.body.kpis)).toBe(true);
    expect(result.body.dataRequests.total).toBe(0);
    expect(result.body.approvals.pending).toBe(0);
  });

  it('returns 404 when the project does not exist', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    ensureSessionMock.mockResolvedValue({ user: { id: admin!.id } } as any);

    const response = await GET(new Request('http://localhost/api/projects/9999/overview'), {
      params: { projectId: '9999' },
    });

    const result = response as unknown as { body: { message: string }; status: number };

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Project not found' });
  });

  it('returns 403 when the actor lacks access to the project', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    const outsider = await prisma.user.create({
      data: { email: 'outsider.next@example.com', passwordHash: 'hash', role: 'CONSULTANT' },
    });

    const project = await createProject({ companyId: 1, name: 'Restricted Project' }, admin!);

    ensureSessionMock.mockResolvedValue({ user: { id: outsider.id } } as any);

    const response = await GET(new Request('http://localhost/api/projects/overview'), {
      params: { projectId: String(project.id) },
    });

    const result = response as unknown as { body: { message: string }; status: number };

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ message: 'Insufficient permissions' });
  });

  it('clears the session cookie when the user no longer exists', async () => {
    ensureSessionMock.mockResolvedValue({ user: { id: 9999 } } as any);

    const response = await GET(new Request('http://localhost/api/projects/overview'), {
      params: { projectId: '1' },
    });

    const result = response as unknown as { status: number };

    expect(result.status).toBe(401);
    expect(clearSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
