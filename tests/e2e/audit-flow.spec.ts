import http from 'http';
import { AddressInfo } from 'net';
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { createApp } from '@/server';
import { resetDatabase } from '@/lib/prisma';

let server: http.Server;
let baseURL: string;

test.beforeAll(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      baseURL = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

test.beforeEach(() => {
  resetDatabase();
});

test('completa login, wizard, solicitud de información y aprobación end-to-end', async () => {
  const api = await playwrightRequest.newContext({ baseURL });
  try {
    const adminLogin = await api.post('/api/auth/login', {
      data: { email: 'admin@example.com', password: 'Admin123!' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const { accessToken: adminToken } = await adminLogin.json();

    const consultantCreation = await api.post('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { email: 'flow-consultant@example.com', password: 'Consult123!', role: 'CONSULTANT' },
    });
    expect(consultantCreation.ok()).toBeTruthy();
    const { id: consultantId } = await consultantCreation.json();

    const projectCreation = await api.post('/api/projects', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        companyId: 1,
        name: 'Auditoría Playwright',
        members: [{ userId: consultantId, role: 'CONSULTANT' }],
        wizard: {
          objectives: ['Asegurar cumplimiento SOX'],
          stakeholders: [{ name: 'Sponsor Ejecutivo', role: 'Sponsor Ejecutivo' }],
        },
      },
    });
    expect(projectCreation.ok()).toBeTruthy();
    const { id: projectId } = await projectCreation.json();

    const consultantLogin = await api.post('/api/auth/login', {
      data: { email: 'flow-consultant@example.com', password: 'Consult123!' },
    });
    expect(consultantLogin.ok()).toBeTruthy();
    const { accessToken: consultantToken } = await consultantLogin.json();

    const dataRequestCreation = await api.post(`/api/projects/${projectId}/data-requests`, {
      headers: { Authorization: `Bearer ${consultantToken}` },
      data: { title: 'Evidencia financiera trimestral' },
    });
    expect(dataRequestCreation.ok()).toBeTruthy();
    const { id: dataRequestId } = await dataRequestCreation.json();

    const dataRequestReview = await api.patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`, {
      headers: { Authorization: `Bearer ${consultantToken}` },
      data: { status: 'IN_REVIEW' },
    });
    expect(dataRequestReview.ok()).toBeTruthy();

    const dataRequestApproval = await api.patch(`/api/projects/${projectId}/data-requests/${dataRequestId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'APPROVED' },
    });
    expect(dataRequestApproval.ok()).toBeTruthy();

    const approvalCreation = await api.post(`/api/projects/${projectId}/approvals`, {
      headers: { Authorization: `Bearer ${consultantToken}` },
      data: { title: 'Extensión de alcance', description: 'Agregar auditoría de planta secundaria' },
    });
    expect(approvalCreation.ok()).toBeTruthy();
    const { id: approvalId } = await approvalCreation.json();

    const approvalDecision = await api.patch(`/api/projects/${projectId}/approvals/${approvalId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'APPROVED' },
    });
    expect(approvalDecision.ok()).toBeTruthy();

    const overviewResponse = await api.get(`/api/projects/${projectId}/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(overviewResponse.ok()).toBeTruthy();
    const overview = await overviewResponse.json();

    expect(overview.project.name).toBe('Auditoría Playwright');
    expect(Array.isArray(overview.pendingChecklists)).toBe(true);
    expect(overview.topRisks.length).toBeGreaterThan(0);
  } finally {
    await api.dispose();
  }
});
