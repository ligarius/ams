import request from 'supertest';
import { createApp } from '@/server';
import prisma, { resetDatabase } from '@/lib/prisma';

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

  it('allows project creation with role checks and audit logging', async () => {
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

    const memberships = await prisma.membership.findMany({ where: { projectId } });
    const membershipSummary = memberships
      .map((membership) => ({ userId: membership.userId, role: membership.role }))
      .sort((a, b) => a.userId - b.userId);
    expect(membershipSummary).toEqual([
      { userId: user.id, role: 'ADMIN' },
      { userId: newMemberResponse.body.id, role: 'CONSULTANT' },
    ]);
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
