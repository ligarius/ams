import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import { createApproval, transitionApproval } from '@/services/approvalService';
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

describe('approvalService', () => {
  let admin: User;
  let project: Project;

  beforeEach(async () => {
    jest.resetAllMocks();
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject(
      {
        companyId: 1,
        name: 'Proyecto firmas unit',
      },
      admin
    );
    mockSignatureProvider.createEnvelope.mockResolvedValue({
      envelopeId: 'env-unit',
      documentId: 'doc-unit',
      signingUrl: 'https://sign.example.com/envelope/env-unit',
      status: 'SENT',
      sentAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: null,
      declinedAt: null,
    });
    mockSignatureProvider.getEnvelopeStatus.mockResolvedValue({
      envelopeId: 'env-unit',
      documentId: 'doc-unit',
      signingUrl: 'https://sign.example.com/envelope/env-unit',
      status: 'SIGNED',
      sentAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-02T00:00:00Z'),
      declinedAt: null,
    });
  });

  it('throws a descriptive error when signature status cannot be refreshed', async () => {
    const approval = await createApproval(
      project.id,
      {
        title: 'Contrato confidencial',
        documentTemplateId: 'tpl-unit',
        signer: { name: 'Unit Admin', email: 'admin@example.com' },
      },
      admin
    );

    mockSignatureProvider.getEnvelopeStatus.mockRejectedValueOnce(new Error('network error'));

    await expect(transitionApproval(project.id, approval.id, { status: 'APPROVED' }, admin)).rejects.toThrow(
      'Unable to refresh signature status'
    );
  });

  it('rejects approval transitions when the signature is still pending', async () => {
    const approval = await createApproval(
      project.id,
      {
        title: 'Firma pendiente',
        documentTemplateId: 'tpl-pending',
        signer: { name: 'Pending User', email: 'admin@example.com' },
      },
      admin
    );

    mockSignatureProvider.getEnvelopeStatus.mockResolvedValueOnce({
      envelopeId: 'env-unit',
      documentId: 'doc-unit',
      signingUrl: 'https://sign.example.com/envelope/env-unit',
      status: 'SENT',
      sentAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: null,
      declinedAt: null,
    });

    await expect(transitionApproval(project.id, approval.id, { status: 'APPROVED' }, admin)).rejects.toThrow(
      'Cannot approve until the signature is completed'
    );
  });
});
