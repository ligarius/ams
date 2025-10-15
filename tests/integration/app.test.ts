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

  it('allows admin to manage companies with audit logging and headers', async () => {
    const { accessToken } = await loginAdmin();

    const listResponse = await request(app).get('/api/companies').set('Authorization', `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.headers['cache-control']).toBe('no-store');
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Acme Corp' }),
      ])
    );

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Globex Corporation' });
    expect(createResponse.status).toBe(201);

    const updateResponse = await request(app)
      .patch(`/api/companies/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Globex Corp' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Globex Corp');

    const [createdLog, updatedLog] = await Promise.all([
      prisma.auditLog.findMany({ where: { action: 'COMPANY_CREATED' } }),
      prisma.auditLog.findMany({ where: { action: 'COMPANY_UPDATED' } }),
    ]);

    expect(createdLog.some((entry) => entry.metadata?.companyId === createResponse.body.id)).toBe(true);
    expect(updatedLog.some((entry) => entry.metadata?.companyId === createResponse.body.id)).toBe(true);
  });

  it('blocks non-admin users from creating companies', async () => {
    const { accessToken: adminToken } = await loginAdmin();
    const consultantResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'consultant@example.com', password: 'Consult123!', role: 'CONSULTANT' });
    expect(consultantResponse.status).toBe(201);

    const consultantLogin = await request(app).post('/api/auth/login').send({
      email: 'consultant@example.com',
      password: 'Consult123!',
    });
    expect(consultantLogin.status).toBe(200);

    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${consultantLogin.body.accessToken}`)
      .send({ name: 'Unauthorized Inc' });
    expect(response.status).toBe(403);
  });

  it('exposes wizard configuration with defaults for project creation', async () => {
    const { accessToken } = await loginAdmin();

    const response = await request(app)
      .get('/api/projects/wizard/config')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.frameworks)).toBe(true);
    expect(response.body.frameworks.length).toBeGreaterThan(0);
    expect(response.body.frameworks[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), checklist: expect.any(Array) })
    );
    expect(response.body.defaults.objectives.length).toBeGreaterThan(0);
    expect(response.body.defaults.milestones.every((item: { dueDate: string }) => typeof item.dueDate === 'string')).toBe(true);
    expect(response.body.riskLevels).toEqual(expect.arrayContaining(['LOW', 'MEDIUM', 'HIGH']));
  });

  it('prevents clients from accessing wizard configuration', async () => {
    const { accessToken: adminToken } = await loginAdmin();

    const clientCreation = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'client@example.com', password: 'Client123!', role: 'CLIENT' });
    expect(clientCreation.status).toBe(201);

    const clientLogin = await request(app).post('/api/auth/login').send({
      email: 'client@example.com',
      password: 'Client123!',
    });
    expect(clientLogin.status).toBe(200);

    const response = await request(app)
      .get('/api/projects/wizard/config')
      .set('Authorization', `Bearer ${clientLogin.body.accessToken}`);

    expect(response.status).toBe(403);
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
    expect(partialOverview.body.pendingChecklists.length).toBeGreaterThanOrEqual(3);
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
    expect(defaultOverview.body.pendingChecklists.length).toBeGreaterThanOrEqual(3);
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

  it('supports the sprint 3 operational flow across data requests, risks, findings and approvals', async () => {
    const { accessToken: adminToken, user: adminUser } = await loginAdmin();

    const consultantResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 's3.consultant@example.com', password: 'Consult123!', role: 'CONSULTANT' });
    expect(consultantResponse.status).toBe(201);

    const clientResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 's3.client@example.com', password: 'Client123!', role: 'CLIENT' });
    expect(clientResponse.status).toBe(201);

    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyId: 1,
        name: 'Sprint 3 Project',
        members: [
          { userId: consultantResponse.body.id, role: 'CONSULTANT' },
          { userId: clientResponse.body.id, role: 'CLIENT' },
        ],
      });
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.body.id as number;

    const consultantLogin = await request(app).post('/api/auth/login').send({
      email: 's3.consultant@example.com',
      password: 'Consult123!',
    });
    expect(consultantLogin.status).toBe(200);
    const consultantToken = consultantLogin.body.accessToken as string;

    const clientLogin = await request(app).post('/api/auth/login').send({
      email: 's3.client@example.com',
      password: 'Client123!',
    });
    expect(clientLogin.status).toBe(200);
    const clientToken = clientLogin.body.accessToken as string;

    const dataRequestResponse = await request(app)
      .post(`/api/projects/${projectId}/data-requests`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({
        title: 'Evidencia de controles',
        description: 'Subir reportes del Q1',
        dueDate: new Date('2024-05-05T10:00:00Z').toISOString(),
      });
    expect(dataRequestResponse.status).toBe(201);
    const dataRequestId = dataRequestResponse.body.id as number;
    expect(dataRequestResponse.body.status).toBe('PENDING');

    const attachmentResponse = await request(app)
      .post(`/api/projects/${projectId}/data-requests/${dataRequestId}/files`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ fileName: 'evidencia.pdf', content: 'base64content' });
    expect(attachmentResponse.status).toBe(201);
    expect(attachmentResponse.body.fileName).toBe('evidencia.pdf');

    const forbiddenClientUpdate = await request(app)
      .patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ title: 'Cambio no permitido' });
    expect(forbiddenClientUpdate.status).toBe(403);

    const reviewResponse = await request(app)
      .patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'IN_REVIEW' });
    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.status).toBe('IN_REVIEW');

    const approveResponse = await request(app)
      .patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'APPROVED' });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe('APPROVED');
    expect(Array.isArray(approveResponse.body.attachments)).toBe(true);
    expect(approveResponse.body.attachments).toHaveLength(1);

    const riskResponse = await request(app)
      .post(`/api/projects/${projectId}/risks`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({
        title: 'Dependencia de evidencia',
        description: 'Riesgo por retrasos en cargas',
        likelihood: 'MEDIUM',
        severity: 'HIGH',
        dataRequestId,
      });
    expect(riskResponse.status).toBe(201);
    const riskId = riskResponse.body.id as number;
    expect(riskResponse.body.dataRequest.id).toBe(dataRequestId);

    const findingResponse = await request(app)
      .post(`/api/projects/${projectId}/findings`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({
        riskId,
        dataRequestId,
        title: 'Hallazgo de demora',
        description: 'Se detectaron retrasos recurrentes en la entrega',
      });
    expect(findingResponse.status).toBe(201);
    const findingId = findingResponse.body.id as number;
    expect(findingResponse.body.dataRequest.id).toBe(dataRequestId);

    const findingResolution = await request(app)
      .patch(`/api/projects/${projectId}/findings/${findingId}`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'RESOLVED' });
    expect(findingResolution.status).toBe(200);
    expect(findingResolution.body.status).toBe('RESOLVED');

    const approvalsEmpty = await request(app)
      .get(`/api/projects/${projectId}/approvals`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(approvalsEmpty.status).toBe(200);
    expect(approvalsEmpty.body).toHaveLength(0);

    const approvalCreate = await request(app)
      .post(`/api/projects/${projectId}/approvals`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ title: 'Cambio de alcance', description: 'Extender revisión a planta adicional' });
    expect(approvalCreate.status).toBe(201);
    const approvalId = approvalCreate.body.id as number;
    expect(approvalCreate.body.status).toBe('PENDING');

    const invalidTransition = await request(app)
      .patch(`/api/projects/${projectId}/approvals/${approvalId}`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'PENDING' });
    expect(invalidTransition.status).toBe(400);

    const approvalDecision = await request(app)
      .patch(`/api/projects/${projectId}/approvals/${approvalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', comment: 'Avalado por comité' });
    expect(approvalDecision.status).toBe(200);
    expect(approvalDecision.body.status).toBe('APPROVED');
    expect(approvalDecision.body.decidedById).toBe(adminUser.id);

    const listResponse = await request(app)
      .get(`/api/projects/${projectId}/data-requests`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .query({ status: 'APPROVED' });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].attachments).toHaveLength(1);

    const [logs] = await Promise.all([
      prisma.auditLog.findMany({ where: { action: 'DATA_REQUEST_UPDATED' } }),
    ]);
    expect(logs.some((log) => log.metadata?.dataRequestId === dataRequestId && log.metadata?.status === 'APPROVED')).toBe(true);
  });

  it('serves Prometheus metrics and handles unknown routes securely', async () => {
    const metricsResponse = await request(app).get('/metrics');
    expect(metricsResponse.status).toBe(200);
    const metricsContentType = metricsResponse.headers['content-type'];
    expect(metricsContentType).toBeDefined();
    expect(metricsContentType).toContain('text/plain');
    expect(metricsContentType).toContain('version=0.0.4');
    expect(metricsResponse.text).toContain('ams_users_total');

    const notFoundResponse = await request(app).get('/totally-unknown-route');
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.body).toEqual({ message: 'Not found' });
  });

  it('guards data request routes against malformed identifiers and payloads', async () => {
    const { accessToken } = await loginAdmin();

    const invalidIdentifierResponse = await request(app)
      .get('/api/projects/not-a-number/data-requests')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidIdentifierResponse.status).toBe(400);
    expect(invalidIdentifierResponse.body.message).toBe('Invalid project id');

    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId: 1, name: 'Proyecto para validaciones' });
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.body.id as number;

    const invalidStatusResponse = await request(app)
      .get(`/api/projects/${projectId}/data-requests`)
      .query({ status: 'UNKNOWN' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidStatusResponse.status).toBe(400);
    expect(invalidStatusResponse.body.message).toBe('Invalid status filter');

    const outsiderResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'external@example.com', password: 'External123!', role: 'CONSULTANT' });
    expect(outsiderResponse.status).toBe(201);

    const unauthorizedAssignment = await request(app)
      .post(`/api/projects/${projectId}/data-requests`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Solicitud inválida', assignedToId: outsiderResponse.body.id });
    expect(unauthorizedAssignment.status).toBe(400);
    expect(unauthorizedAssignment.body.message).toBe('Assigned user is not part of the project');

    const createResponse = await request(app)
      .post(`/api/projects/${projectId}/data-requests`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Documentación inicial' });
    expect(createResponse.status).toBe(201);
    const dataRequestId = createResponse.body.id as number;

    const invalidTransition = await request(app)
      .patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'APPROVED' });
    expect(invalidTransition.status).toBe(400);
    expect(invalidTransition.body.message).toBe('Invalid status transition');

    const transitionResponse = await request(app)
      .patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_REVIEW' });
    expect(transitionResponse.status).toBe(200);
    expect(transitionResponse.body.status).toBe('IN_REVIEW');

    const invalidAttachmentResponse = await request(app)
      .post(`/api/projects/${projectId}/data-requests/${dataRequestId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fileName: '' });
    expect(invalidAttachmentResponse.status).toBe(400);
    expect(invalidAttachmentResponse.body.message).toBe('Invalid payload');

    const attachmentResponse = await request(app)
      .post(`/api/projects/${projectId}/data-requests/${dataRequestId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fileName: 'evidencia.txt', content: 'Detalle del control' });
    expect(attachmentResponse.status).toBe(201);

    const attachmentsList = await request(app)
      .get(`/api/projects/${projectId}/data-requests/${dataRequestId}/files`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(attachmentsList.status).toBe(200);
    expect(Array.isArray(attachmentsList.body)).toBe(true);
    expect(attachmentsList.body[0].fileName).toBe('evidencia.txt');

    const missingRequestAttachments = await request(app)
      .get(`/api/projects/${projectId}/data-requests/999/files`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(missingRequestAttachments.status).toBe(404);
    expect(missingRequestAttachments.body.message).toBe('Data request not found');
  });
});
