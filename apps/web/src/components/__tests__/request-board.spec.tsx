import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestBoardProject } from '../request-board';
import { RequestBoard } from '../request-board';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

type FetchMock = ReturnType<typeof vi.fn>;

const buildProjects = (): RequestBoardProject[] => [
  {
    id: 1,
    name: 'Auditoría Demo',
    description: 'Proyecto de prueba',
    requests: [
      {
        id: 10,
        title: 'Evidencia financiera',
        description: 'Adjuntar estados financieros auditados.',
        status: 'PENDING',
        dueDate: '2024-01-10',
        assignedToId: null,
        createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
        attachments: [],
      },
      {
        id: 11,
        title: 'Reporte de cumplimiento',
        description: null,
        status: 'APPROVED',
        dueDate: null,
        assignedToId: null,
        createdAt: new Date('2023-12-20T12:00:00Z').toISOString(),
        updatedAt: new Date('2023-12-21T12:00:00Z').toISOString(),
        attachments: [
          {
            id: 201,
            fileName: 'soporte.pdf',
            content: 'base64:xxx',
            uploadedAt: new Date('2023-12-22T08:30:00Z').toISOString(),
            uploadedById: 1,
          },
        ],
      },
    ],
  },
];

const createResponse = <T,>(body: T, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: async () => body,
  } as unknown as Response);

describe('RequestBoard', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    refreshMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('filtra solicitudes por estado y muestra adjuntos existentes', () => {
    render(<RequestBoard projects={buildProjects()} canMutate viewerRole="ADMIN" />);

    expect(screen.getByText('Evidencia financiera')).toBeInTheDocument();
    expect(screen.getByText('Reporte de cumplimiento')).toBeInTheDocument();
    expect(screen.getByText('soporte.pdf')).toBeInTheDocument();

    const approvedFilter = screen.getByRole('button', { name: /Aprobadas/i });
    fireEvent.click(approvedFilter);

    expect(screen.queryByText('Evidencia financiera')).not.toBeInTheDocument();
    expect(screen.getByText('Reporte de cumplimiento')).toBeInTheDocument();
  });

  it('valida y crea una solicitud mostrando mensajes de éxito', async () => {
    render(<RequestBoard projects={buildProjects()} canMutate viewerRole="ADMIN" />);

    const createButton = screen.getAllByRole('button', { name: /Registrar solicitud/i })[0];
    fireEvent.click(createButton);

    const dialog = await screen.findByRole('dialog', { name: /Registrar solicitud/i });
    const saveButton = within(dialog).getByRole('button', { name: /Guardar solicitud/i });
    fireEvent.click(saveButton);
    expect(await within(dialog).findByText(/al menos 3 caracteres/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const titleField = within(dialog).getByLabelText(/Título/i);
    fireEvent.change(titleField, { target: { value: 'Solicitud de inventario' } });

    const descriptionField = within(dialog).getByLabelText(/Descripción/i);
    fireEvent.change(descriptionField, { target: { value: 'Detalle de inventario 2024' } });

    const dueDateField = within(dialog).getByLabelText(/Fecha límite/i);
    fireEvent.change(dueDateField, { target: { value: '2024-02-01' } });

    const createdRequest = {
      id: 99,
      title: 'Solicitud de inventario',
      description: 'Detalle de inventario 2024',
      status: 'PENDING' as const,
      dueDate: '2024-02-01',
      assignedToId: null,
      createdAt: new Date('2024-01-05T12:00:00Z').toISOString(),
      updatedAt: new Date('2024-01-05T12:00:00Z').toISOString(),
      attachments: [],
    };

    fetchMock.mockResolvedValueOnce(createResponse(createdRequest, true, 201));

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/data-requests',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1]?.body ?? '{}') as string);
    expect(body).toMatchObject({
      title: 'Solicitud de inventario',
      description: 'Detalle de inventario 2024',
      dueDate: '2024-02-01',
    });

    expect(await screen.findByText('Solicitud creada correctamente.')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('actualiza el estado y permite agregar adjuntos', async () => {
    render(<RequestBoard projects={buildProjects()} canMutate viewerRole="ADMIN" />);

    const updatedRequest = {
      id: 10,
      title: 'Evidencia financiera',
      description: 'Adjuntar estados financieros auditados.',
      status: 'IN_REVIEW' as const,
      dueDate: '2024-01-10',
      assignedToId: null,
      createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
      updatedAt: new Date('2024-01-04T12:00:00Z').toISOString(),
      attachments: [],
    };

    fetchMock.mockResolvedValueOnce(createResponse(updatedRequest));

    const requestCard = screen.getAllByTestId('data-request-10')[0];
    expect(requestCard).not.toBeNull();
    const statusLabels = within(requestCard).getAllByText('Actualizar estado');
    const statusLabel =
      statusLabels.find((element) => element.tagName === 'LABEL') ?? statusLabels[0];
    const statusSelect = statusLabel.parentElement?.querySelector('[role="combobox"]') as HTMLElement | null;
    expect(statusSelect).not.toBeNull();
    if (!statusSelect) {
      throw new Error('No se encontró el selector de estado');
    }

    fireEvent.mouseDown(statusSelect);
    const reviewOption = await screen.findByRole('option', { name: /En revisión/i });
    fireEvent.click(reviewOption);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/data-requests/10',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    expect(await screen.findByText('Estado actualizado correctamente.')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
    if (requestCard) {
      const withinCard = within(requestCard);
      expect(withinCard.getAllByText('En revisión').length).toBeGreaterThan(0);
    }

    const attachmentResponse = {
      id: 305,
      fileName: 'evidencia.xlsx',
      content: 'base64:data',
      uploadedAt: new Date('2024-01-06T09:00:00Z').toISOString(),
      uploadedById: 1,
    };

    fetchMock.mockResolvedValueOnce(createResponse(attachmentResponse, true, 201));

    const addAttachmentButtons = screen.getAllByRole('button', { name: /Agregar adjunto/i });
    fireEvent.click(addAttachmentButtons[0]);

    const attachmentDialog = await screen.findByRole('dialog', { name: /Agregar adjunto/i });

    const fileNameField = within(attachmentDialog).getByLabelText(/Nombre del archivo/i);
    fireEvent.change(fileNameField, { target: { value: 'evidencia.xlsx' } });

    const contentField = within(attachmentDialog).getByLabelText(/Contenido/i);
    fireEvent.change(contentField, { target: { value: 'base64:data' } });

    const saveAttachmentButton = within(attachmentDialog).getByRole('button', { name: /Guardar adjunto/i });
    fireEvent.click(saveAttachmentButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/1/data-requests/10/attachments',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const attachmentBody = JSON.parse((fetchMock.mock.calls.at(-1)?.[1]?.body ?? '{}') as string);
    expect(attachmentBody).toMatchObject({ fileName: 'evidencia.xlsx', content: 'base64:data' });

    expect(await screen.findByText('Adjunto agregado correctamente.')).toBeInTheDocument();
    expect(screen.getByText('evidencia.xlsx')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});
