import bcrypt from 'bcrypt';
import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import {
  addProjectDocumentVersion,
  createProjectDocument,
  listProjectDocuments,
  transitionDocumentStatus,
} from '@/services/documentService';

describe('documentService', () => {
  let admin: User;
  let project: Project;

  const createUser = async (email: string, role: User['role']): Promise<User> => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    return prisma.user.create({ data: { email, passwordHash, role } });
  };

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
    project = await createProject(
      {
        companyId: 1,
        name: 'Repositorio Documental',
        description: 'Proyecto para validar gestión documental',
        wizard: {},
      },
      admin
    );
  });

  it('prevents clients from creating non-evidence documents', async () => {
    const client = await createUser('cliente@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(
      createProjectDocument(
        project.id,
        {
          title: 'Reporte Ejecutivo',
          category: 'DELIVERABLE',
          fileName: 'reporte.pdf',
          content: 'Contenido de reporte',
        },
        client
      )
    ).rejects.toThrow('Clients can only create evidence documents');
  });

  it('creates documents with versioning and optional review submission', async () => {
    const consultant = await createUser('consultor@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });

    const document = await createProjectDocument(
      project.id,
      {
        title: 'Manual de Control',
        description: 'Procedimiento operativo documentado',
        category: 'DELIVERABLE',
        tags: ['ISO27001', 'Control'],
        fileName: 'manual-v1.pdf',
        content: 'Versión 1',
        submitForReview: true,
      },
      consultant
    );

    expect(document.status).toBe('IN_REVIEW');
    expect(document.latestVersion?.version).toBe(1);
    expect(document.versions).toHaveLength(1);
    expect(document.tags).toEqual(['iso27001', 'control']);
  });

  it('rejects duplicate content when adding versions and resets status to draft', async () => {
    const document = await createProjectDocument(
      project.id,
      {
        title: 'Procedimiento',
        category: 'POLICY',
        fileName: 'procedimiento.pdf',
        content: 'Contenido inicial',
      },
      admin
    );

    await expect(
      addProjectDocumentVersion(
        project.id,
        document.id,
        { fileName: 'procedimiento-v2.pdf', content: 'Contenido inicial' },
        admin
      )
    ).rejects.toThrow('No changes detected for new version');

    const updated = await addProjectDocumentVersion(
      project.id,
      document.id,
      { fileName: 'procedimiento-v2.pdf', content: 'Contenido actualizado' },
      admin
    );

    expect(updated.status).toBe('DRAFT');
    expect(updated.latestVersion?.version).toBe(2);
  });

  it('enforces publication workflow roles', async () => {
    const consultant = await createUser('consultor-flujo@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });

    const document = await createProjectDocument(
      project.id,
      {
        title: 'Informe Final',
        category: 'DELIVERABLE',
        fileName: 'informe.pdf',
        content: 'Borrador inicial',
        submitForReview: true,
      },
      admin
    );

    const approved = await transitionDocumentStatus(project.id, document.id, { status: 'APPROVED' }, consultant);
    expect(approved.status).toBe('APPROVED');

    await expect(
      transitionDocumentStatus(project.id, document.id, { status: 'PUBLISHED' }, consultant)
    ).rejects.toThrow('Insufficient permissions');

    const published = await transitionDocumentStatus(project.id, document.id, { status: 'PUBLISHED' }, admin);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).not.toBeNull();
  });

  it('lists documents with filters including latest version context', async () => {
    const document = await createProjectDocument(
      project.id,
      {
        title: 'Bitácora',
        category: 'EVIDENCE',
        fileName: 'bitacora.txt',
        content: 'Entrada inicial',
      },
      admin
    );

    await transitionDocumentStatus(project.id, document.id, { status: 'IN_REVIEW' }, admin);

    const documents = await listProjectDocuments(project.id, admin);
    expect(documents).toHaveLength(1);
    expect(documents[0].latestVersion?.fileName).toBe('bitacora.txt');

    const filtered = await listProjectDocuments(project.id, admin, { status: 'IN_REVIEW' });
    expect(filtered).toHaveLength(1);

    const empty = await listProjectDocuments(project.id, admin, { status: 'APPROVED' });
    expect(empty).toHaveLength(0);
  });
});
