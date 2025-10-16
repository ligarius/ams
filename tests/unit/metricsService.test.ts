import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { createDataRequest, updateDataRequest } from '@/services/dataRequestService';
import { createApproval, transitionApproval } from '@/services/approvalService';
import collectPrometheusMetrics from '@/services/metricsService';
import signatureProvider from '@/services/signatureProvider';

jest.mock('@/services/signatureProvider', () => ({
  __esModule: true,
  default: {
    createEnvelope: jest.fn(),
    getEnvelopeStatus: jest.fn(),
    validateWebhook: jest.fn(),
    parseWebhookEvent: jest.fn(),
  },
}));

const mockSignatureProvider = signatureProvider as jest.Mocked<typeof signatureProvider>;

describe('metricsService', () => {
  let admin: User;
  let project: Project;

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject(
      {
        companyId: 1,
        name: 'Proyecto métricas',
      },
      admin
    );
    mockSignatureProvider.createEnvelope.mockResolvedValue({
      envelopeId: 'env-metrics',
      documentId: 'doc-metrics',
      signingUrl: 'https://sign.example.com/envelope/env-metrics',
      status: 'SENT',
      sentAt: new Date('2024-01-01T12:00:00Z'),
      completedAt: null,
      declinedAt: null,
    });
    mockSignatureProvider.getEnvelopeStatus.mockResolvedValue({
      envelopeId: 'env-metrics',
      documentId: 'doc-metrics',
      signingUrl: 'https://sign.example.com/envelope/env-metrics',
      status: 'SIGNED',
      sentAt: new Date('2024-01-01T12:00:00Z'),
      completedAt: new Date('2024-01-02T12:00:00Z'),
      declinedAt: null,
    });
  });

  it('aggregates counts and formats prometheus metrics', async () => {
    await createDataRequest(
      project.id,
      {
        title: 'Inventario de controles',
      },
      admin
    );

    const secondRequest = await createDataRequest(
      project.id,
      {
        title: 'Plan de acción',
      },
      admin
    );

    await updateDataRequest(project.id, secondRequest.id, { status: 'IN_REVIEW' }, admin);
    await updateDataRequest(project.id, secondRequest.id, { status: 'APPROVED' }, admin);

    const approval = await createApproval(
      project.id,
      {
        title: 'Extensión de alcance',
        description: 'Incluir proceso adicional en revisión',
        documentTemplateId: 'tpl-metrics',
        signer: { name: 'Admin Metrics', email: 'admin@example.com' },
      },
      admin
    );

    await transitionApproval(project.id, approval.id, { status: 'APPROVED' }, admin);

    const metrics = await collectPrometheusMetrics();

    expect(metrics).toContain('# TYPE ams_users_total gauge');
    expect(metrics).toMatch(/ams_projects_total 1/);
    expect(metrics).toMatch(/ams_data_requests_total 2/);
    expect(metrics).toMatch(/ams_data_requests_status_count\{status="pending"\} 1/);
    expect(metrics).toMatch(/ams_data_requests_status_count\{status="approved"\} 1/);
    expect(metrics).toMatch(/ams_approvals_status_count\{status="approved"\} 1/);
    expect(metrics).toMatch(/ams_audit_logs_total [1-9]\d*/);
    expect(metrics.endsWith('\n')).toBe(true);
    expect(metrics.split('\n').some((line) => line.includes('ams_approvals_status_count{status="pending"}'))).toBe(true);
  });
});

