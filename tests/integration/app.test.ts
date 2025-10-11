import request from 'supertest';
import { createApp } from '@/server';
import { resetDatabase } from '@/lib/prisma';

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
    const { accessToken } = await loginAdmin();
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId: 1, name: 'New Project', description: 'Initial audit project' });
    expect(response.status).toBe(201);
    const listResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].name).toBe('New Project');
  });

  it('refreshes tokens and logs out', async () => {
    const { accessToken, refreshToken } = await loginAdmin();
    const refreshResponse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();
    const logoutResponse = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(logoutResponse.status).toBe(204);
  });
});
