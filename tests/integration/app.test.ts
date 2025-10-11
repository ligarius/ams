import request from 'supertest';
import { createApp } from '@/server';
import prisma, { resetDatabase } from '@/lib/prisma';
import { signAccessToken } from '@/utils/token';

const app = createApp();

const loginAdmin = async () => {
  const response = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'Admin123!',
  });
  return response.body;
};

describe('API integration', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('authenticates and returns tokens', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'Admin123!',
    });
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  it('blocks login after repeated failures', async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@example.com',
        password: 'wrong-password',
      });
      if (i < 4) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(423);
      }
    }
  });

  it('requires authentication for user list', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(401);
  });

  it.each([
    ['0'],
    [''],
    ['not-a-number'],
  ])('rejects token with invalid numeric sub value %p', async (subject) => {
    const token = signAccessToken({ sub: subject, role: 'ADMIN' });
    const response = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('allows admin to manage users with anti-cache headers', async () => {
    const { accessToken } = await loginAdmin();
    const listResponse = await request(app).get('/api/users').set('Authorization', `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.headers['cache-control']).toBe('no-store');
    expect(listResponse.headers['pragma']).toBe('no-cache');
    expect(listResponse.headers['expires']).toBe('0');
    const createResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'consultant@example.com', password: 'Consult123!', role: 'CONSULTANT' });
    expect(createResponse.status).toBe(201);
    const patchResponse = await request(app)
      .patch(`/api/users/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'CLIENT' });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.role).toBe('CLIENT');
  });

  it('allows project creation with role checks, wizard seeding and audit logging', async () => {
    const { accessToken, user } = await loginAdmin();
    const newMemberResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'consultant@example.com', password: 'Consult123!', role: 'CONSULTANT' });
    expect(newMemberResponse.status).toBe(201);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        companyId: 1,
        name: 'New Project',
        description: 'Initial audit project',
        members: [{ userId: newMemberResponse.body.id, role: 'CONSULTANT' }],
        wizard: {
          objectives: ['Objetivo personalizado'],
          stakeholders: [
            { name: 'Laura Sponsor', role: 'Sponsor Ejecutivo' },
            { name: 'Equipo Operativo', role: 'Working Group Semanal' },
          ],
          milestones: [
            { name: 'Inicio', dueDate: new Date('2024-05-01T10:00:00.000Z').toISOString() },
            { name: 'Cierre', dueDate: new Date('2024-06-01T10:00:00.000Z').toISOString() },
          ],
          risks: [
            {
              title: 'Disponibilidad de recursos',
              description: 'Rotación del equipo clave.',
              likelihood: 'HIGH',
              impact: 'MEDIUM',
            },
          ],
        },
      });
    expect(response.status).toBe(201);

    const projectId = response.body.id;
    const listResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].name).toBe('New Project');

    const auditLogs = await prisma.auditLog.findMany({ where: { action: 'PROJECT_CREATED' } });
    const hasProjectCreatedLog = auditLogs.some((log) => {
      if (log.userId !== user.id) {
        return false;
      }
      if (!log.metadata || typeof log.metadata !== 'object') {
        return false;
      }
      const metadata = log.metadata as Record<string, unknown>;
      const projectMetadata = metadata['projectId'];
      return typeof projectMetadata === 'number' && projectMetadata === projectId;
    });
    expect(hasProjectCreatedLog).toBe(true);

    const seedLogs = await prisma.auditLog.findMany({ where: { action: 'PROJECT_SEEDED' } });
    expect(seedLogs.some((log) => log.metadata?.projectId === projectId)).toBe(true);

    const memberships = await prisma.membership.findMany({ where: { projectId } });
    const membershipSummary = memberships
      .map((membership) => ({ userId: membership.userId, role: membership.role }))
      .sort((a, b) => a.userId - b.userId);
    expect(membershipSummary).toEqual([
      { userId: user.id, role: 'ADMIN' },
      { userId: newMemberResponse.body.id, role: 'CONSULTANT' },
    ]);

    const overviewResponse = await request(app)
      .get(`/api/projects/${projectId}/overview`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.project.name).toBe('New Project');
    expect(overviewResponse.body.kpis).toHaveLength(3);
    expect(overviewResponse.body.pendingChecklists[0].name).toBe('Inicio');
    expect(overviewResponse.body.topRisks[0].title).toBe('Disponibilidad de recursos');
    expect(overviewResponse.body.governance[0].owner).toBe('Laura Sponsor');
  });

  it('applies default wizard data when payload is partial or missing', async () => {
    const { accessToken } = await loginAdmin();

    const partialWizardResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        companyId: 1,
        name: 'Partial Wizard Project',
        wizard: {
          objectives: ['Validar controles críticos'],
        },
      });

    expect(partialWizardResponse.status).toBe(201);

    const partialOverview = await request(app)
      .get(`/api/projects/${partialWizardResponse.body.id}/overview`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(partialOverview.status).toBe(200);
    expect(partialOverview.body.pendingChecklists).toHaveLength(3);
    expect(partialOverview.body.pendingChecklists[0].name).toBe('Kickoff con stakeholders');
    expect(partialOverview.body.topRisks).toHaveLength(2);
    expect(partialOverview.body.governance[0].owner).toBe('María González');

    const defaultWizardResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        companyId: 1,
        name: 'Default Wizard Project',
      });

    expect(defaultWizardResponse.status).toBe(201);

    const defaultCategories = await prisma.projectCategory.findMany({
      where: { projectId: defaultWizardResponse.body.id },
    });
    expect(defaultCategories).toHaveLength(3);
    expect(defaultCategories[0].name).toBe('Comprender el marco de control y gobierno actual');

    const defaultGovernance = await prisma.governanceEvent.findMany({
      where: { projectId: defaultWizardResponse.body.id },
    });
    expect(defaultGovernance).toHaveLength(3);
    expect(defaultGovernance[0].owner).toBe('María González');

    const defaultOverview = await request(app)
      .get(`/api/projects/${defaultWizardResponse.body.id}/overview`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(defaultOverview.status).toBe(200);
    expect(defaultOverview.body.kpis).toHaveLength(3);
    expect(defaultOverview.body.pendingChecklists).toHaveLength(3);
  });

  it('returns 403 when client attempts to create a project', async () => {
    const { accessToken } = await loginAdmin();
    const clientEmail = 'client.forbidden@example.com';
    const clientPassword = 'Client123!';

    const createClientResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: clientEmail, password: clientPassword, role: 'CLIENT' });
    expect(createClientResponse.status).toBe(201);

    const clientLogin = await request(app).post('/api/auth/login').send({
      email: clientEmail,
      password: clientPassword,
    });
    expect(clientLogin.status).toBe(200);

    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${clientLogin.body.accessToken}`)
      .send({ companyId: 1, name: 'Forbidden Project' });

    expect(projectResponse.status).toBe(403);
    expect(projectResponse.body.message).toBe('Insufficient permissions');
  });

  it('returns 403 when updating a project without membership', async () => {
    const { accessToken } = await loginAdmin();

    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId: 1, name: 'Restricted Project' });
    expect(projectResponse.status).toBe(201);

    const outsiderEmail = 'outsider-update@example.com';
    const outsiderPassword = 'Outsider123!';

    const outsiderCreate = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: outsiderEmail, password: outsiderPassword, role: 'CONSULTANT' });
    expect(outsiderCreate.status).toBe(201);

    const outsiderLogin = await request(app).post('/api/auth/login').send({
      email: outsiderEmail,
      password: outsiderPassword,
    });
    expect(outsiderLogin.status).toBe(200);

    const outsiderPatch = await request(app)
      .patch(`/api/projects/${projectResponse.body.id}`)
      .set('Authorization', `Bearer ${outsiderLogin.body.accessToken}`)
      .send({ name: 'Updated Name' });

    expect(outsiderPatch.status).toBe(403);
    expect(outsiderPatch.body.message).toBe('Insufficient permissions');
  });

  it('returns 404 when updating a non-existent project', async () => {
    const { accessToken } = await loginAdmin();

    const response = await request(app)
      .patch('/api/projects/9999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ghost Project' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Project not found');
  });

  it('returns 403 when requesting overview without membership', async () => {
    const { accessToken } = await loginAdmin();
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId: 1, name: 'Proyecto sin acceso' });
    expect(projectResponse.status).toBe(201);

    const outsiderUser = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'outsider@example.com', password: 'Outsider123!', role: 'CONSULTANT' });
    expect(outsiderUser.status).toBe(201);

    const outsiderLogin = await request(app).post('/api/auth/login').send({
      email: 'outsider@example.com',
      password: 'Outsider123!',
    });
    expect(outsiderLogin.status).toBe(200);

    const outsiderResponse = await request(app)
      .get(`/api/projects/${projectResponse.body.id}/overview`)
      .set('Authorization', `Bearer ${outsiderLogin.body.accessToken}`);
    expect(outsiderResponse.status).toBe(403);
  });

  it('fails project creation when members include an unknown user', async () => {
    const { accessToken } = await loginAdmin();

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        companyId: 1,
        name: 'Invalid Project',
        members: [{ userId: 9999, role: 'CONSULTANT' }],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Member');

    const projects = await prisma.project.findMany();
    expect(projects).toHaveLength(0);

    const memberships = await prisma.membership.findMany({ where: { projectId: 1 } });
    expect(memberships).toHaveLength(0);
  });

  it('refreshes tokens and logs out', async () => {
    const { accessToken, refreshToken } = await loginAdmin();
    const refreshResponse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();
    const refreshedRefreshToken = refreshResponse.body.refreshToken as string | undefined;
    expect(refreshedRefreshToken).toBeDefined();
    const logoutResponse = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(logoutResponse.status).toBe(204);
    const postLogoutRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshedRefreshToken });
    expect(postLogoutRefreshResponse.status).toBe(401);
    expect(postLogoutRefreshResponse.body.accessToken).toBeUndefined();
  });
});
