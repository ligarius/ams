import bcrypt from 'bcrypt';
import prisma, { Project, User, resetDatabase } from '@/lib/prisma';
import { createProject } from '@/services/projectService';
import {
  addDataRequestAttachment,
  createDataRequest,
  listDataRequestAttachments,
  updateDataRequest,
} from '@/services/dataRequestService';

describe('dataRequestService', () => {
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
        name: 'Auditoría integral',
        description: 'Proyecto base para validaciones de solicitudes de información',
      },
      admin
    );
  });

  it('rejects creation by client members even if they belong to the project', async () => {
    const client = await createUser('client@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(
      createDataRequest(
        project.id,
        {
          title: 'Plan de remediación',
          description: 'Detalle de acciones solicitadas',
        },
        client
      )
    ).rejects.toThrow('Insufficient permissions');
  });

  it('validates assigned membership when creating requests', async () => {
    const outsider = await createUser('external@example.com', 'CONSULTANT');

    await expect(
      createDataRequest(
        project.id,
        {
          title: 'Evidencia de controles',
          assignedToId: outsider.id,
        },
        admin
      )
    ).rejects.toThrow('Assigned user is not part of the project');
  });

  it('throws when attempting to update a non-existent data request', async () => {
    await expect(updateDataRequest(project.id, 9999, {}, admin)).rejects.toThrow('Data request not found');
  });

  it('prevents invalid status transitions and client approvals', async () => {
    const consultant = await createUser('consultant@example.com', 'CONSULTANT');
    await prisma.membership.create({ data: { projectId: project.id, userId: consultant.id, role: 'CONSULTANT' } });
    const dataRequest = await createDataRequest(
      project.id,
      {
        title: 'Políticas actualizadas',
      },
      admin
    );

    await expect(
      updateDataRequest(
        project.id,
        dataRequest.id,
        {
          status: 'APPROVED',
        },
        admin
      )
    ).rejects.toThrow('Invalid status transition');

    await updateDataRequest(
      project.id,
      dataRequest.id,
      {
        status: 'IN_REVIEW',
      },
      consultant
    );

    const client = await createUser('another-client@example.com', 'CLIENT');
    await prisma.membership.create({ data: { projectId: project.id, userId: client.id, role: 'CLIENT' } });

    await expect(
      updateDataRequest(
        project.id,
        dataRequest.id,
        {
          status: 'APPROVED',
        },
        client
      )
    ).rejects.toThrow('Insufficient permissions');
  });

  it('requires assignee membership when updating assignments', async () => {
    const request = await createDataRequest(
      project.id,
      {
        title: 'Mapa de procesos',
      },
      admin
    );

    const outsider = await createUser('third-party@example.com', 'CONSULTANT');

    await expect(
      updateDataRequest(
        project.id,
        request.id,
        {
          assignedToId: outsider.id,
        },
        admin
      )
    ).rejects.toThrow('Assigned user is not part of the project');
  });

  it('validates data request existence when attaching or listing evidence', async () => {
    await expect(
      addDataRequestAttachment(
        project.id,
        1234,
        {
          fileName: 'evidencia.pdf',
          content: 'ZXZpZGVuY2lh',
        },
        admin
      )
    ).rejects.toThrow('Data request not found');

    const request = await createDataRequest(
      project.id,
      {
        title: 'Seguimiento de acciones',
      },
      admin
    );

    const attachment = await addDataRequestAttachment(
      project.id,
      request.id,
      {
        fileName: 'bitacora.txt',
        content: 'Detalle del seguimiento semanal',
      },
      admin
    );

    const attachments = await listDataRequestAttachments(project.id, request.id, admin);

    expect(attachments).toHaveLength(1);
    expect(attachments[0].id).toBe(attachment.id);
    expect(attachments[0].fileName).toBe('bitacora.txt');
  });
});

