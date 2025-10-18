'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AttachmentIcon from '@mui/icons-material/Attachment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { DataRequestStatus, UserRole } from '@backend/lib/prisma';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

const statusLabels: Record<DataRequestStatus, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  IN_REVIEW: { label: 'En revisión', color: 'default' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const allowedTransitions: Record<DataRequestStatus, DataRequestStatus[]> = {
  PENDING: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const statusFilterOptions: Array<{ value: DataRequestStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
];

export interface RequestBoardAttachment {
  id: number;
  fileName: string;
  content: string;
  uploadedAt: string;
  uploadedById: number;
}

export interface RequestBoardItem {
  id: number;
  title: string;
  description: string | null;
  status: DataRequestStatus;
  dueDate: string | null;
  assignedToId: number | null;
  createdAt: string;
  updatedAt: string;
  attachments: RequestBoardAttachment[];
}

export interface RequestBoardProject {
  id: number;
  name: string;
  description: string | null;
  requests: RequestBoardItem[];
}

interface RequestBoardProps {
  projects: RequestBoardProject[];
  canMutate: boolean;
  viewerRole: UserRole;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const normalizeRequest = (request: RequestBoardItem): RequestBoardItem => ({
  ...request,
  description: request.description ?? null,
  dueDate: request.dueDate ?? null,
  assignedToId: request.assignedToId ?? null,
  attachments: request.attachments.map((attachment) => ({
    ...attachment,
    content: attachment.content ?? '',
  })),
});

const normalizeAttachment = (attachment: RequestBoardAttachment): RequestBoardAttachment => ({
  ...attachment,
  content: attachment.content ?? '',
});

const sortRequests = (requests: RequestBoardItem[]): RequestBoardItem[] => {
  return [...requests].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

export function RequestBoard({ projects, canMutate, viewerRole }: RequestBoardProps) {
  const router = useRouter();
  const [boardData, setBoardData] = useState<RequestBoardProject[]>(() =>
    projects.map((project) => ({
      ...project,
      requests: sortRequests(project.requests.map((request) => normalizeRequest(request))),
    }))
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projects.length > 0 ? projects[0]!.id : null
  );
  const [statusFilter, setStatusFilter] = useState<DataRequestStatus | 'ALL'>('ALL');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<Record<number, boolean>>({});
  const [attachmentDialog, setAttachmentDialog] = useState<{ projectId: number; requestId: number } | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentContent, setAttachmentContent] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  useEffect(() => {
    setBoardData(
      projects.map((project) => ({
        ...project,
        requests: sortRequests(project.requests.map((request) => normalizeRequest(request))),
      }))
    );
    if (projects.length > 0) {
      setSelectedProjectId(projects[0]!.id);
    } else {
      setSelectedProjectId(null);
    }
  }, [projects]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === null) {
      return null;
    }
    return boardData.find((project) => project.id === selectedProjectId) ?? null;
  }, [boardData, selectedProjectId]);

  const filteredRequests = useMemo(() => {
    if (!selectedProject) {
      return [];
    }
    if (statusFilter === 'ALL') {
      return selectedProject.requests;
    }
    return selectedProject.requests.filter((request) => request.status === statusFilter);
  }, [selectedProject, statusFilter]);

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateDueDate('');
    setCreateError(null);
  };

  const handleCreateRequest = async () => {
    if (!selectedProject) {
      return;
    }
    if (createTitle.trim().length < 3) {
      setCreateError('El título debe tener al menos 3 caracteres.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/data-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim().length ? createDescription.trim() : undefined,
          dueDate: createDueDate.length ? createDueDate : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setCreateError(body?.message ?? 'No fue posible crear la solicitud.');
        return;
      }

      const created = (await response.json()) as RequestBoardItem;
      setBoardData((prev) =>
        prev.map((project) => {
          if (project.id !== selectedProject.id) {
            return project;
          }
          const nextRequests = sortRequests([...project.requests, normalizeRequest(created)]);
          return { ...project, requests: nextRequests };
        })
      );
      setFeedback({ type: 'success', message: 'Solicitud creada correctamente.' });
      setCreateDialogOpen(false);
      resetCreateForm();
      router.refresh();
    } catch (error) {
      console.error('Failed to create data request', error);
      setCreateError('Ocurrió un error inesperado al crear la solicitud.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (
    projectId: number,
    request: RequestBoardItem,
    nextStatus: DataRequestStatus
  ) => {
    if (request.status === nextStatus || !canMutate) {
      return;
    }
    if (!allowedTransitions[request.status].includes(nextStatus)) {
      setFeedback({ type: 'error', message: 'Transición de estado no permitida.' });
      return;
    }

    setStatusLoading((prev) => ({ ...prev, [request.id]: true }));
    setFeedback(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/data-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFeedback({ type: 'error', message: body?.message ?? 'No fue posible actualizar el estado.' });
        return;
      }
      const updated = (await response.json()) as RequestBoardItem;
      setBoardData((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) {
            return project;
          }
          const nextRequests = project.requests.map((item) =>
            item.id === request.id ? normalizeRequest(updated) : item
          );
          return { ...project, requests: sortRequests(nextRequests) };
        })
      );
      setFeedback({ type: 'success', message: 'Estado actualizado correctamente.' });
      router.refresh();
    } catch (error) {
      console.error('Failed to update data request', error);
      setFeedback({ type: 'error', message: 'Ocurrió un error inesperado al actualizar el estado.' });
    } finally {
      setStatusLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const openAttachmentDialog = (projectId: number, requestId: number) => {
    setAttachmentDialog({ projectId, requestId });
    setAttachmentName('');
    setAttachmentContent('');
    setAttachmentError(null);
  };

  const handleAttachmentSubmit = async () => {
    if (!attachmentDialog) {
      return;
    }
    if (attachmentName.trim().length === 0 || attachmentContent.trim().length === 0) {
      setAttachmentError('Completa el nombre del archivo y el contenido.');
      return;
    }
    setAttachmentLoading(true);
    setAttachmentError(null);
    try {
      const { projectId, requestId } = attachmentDialog;
      const response = await fetch(
        `/api/projects/${projectId}/data-requests/${requestId}/attachments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: attachmentName.trim(),
            content: attachmentContent.trim(),
          }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setAttachmentError(body?.message ?? 'No fue posible adjuntar el archivo.');
        return;
      }
      const created = (await response.json()) as RequestBoardAttachment;
      setBoardData((prev) =>
        prev.map((project) => {
          if (project.id !== attachmentDialog.projectId) {
            return project;
          }
          const nextRequests = project.requests.map((item) => {
            if (item.id !== attachmentDialog.requestId) {
              return item;
            }
            return {
              ...item,
              attachments: [...item.attachments, normalizeAttachment(created)],
            };
          });
          return { ...project, requests: nextRequests };
        })
      );
      setFeedback({ type: 'success', message: 'Adjunto agregado correctamente.' });
      setAttachmentDialog(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to add attachment', error);
      setAttachmentError('Ocurrió un error inesperado al adjuntar el archivo.');
    } finally {
      setAttachmentLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {feedback ? (
        <Alert
          severity={feedback.type === 'error' ? 'error' : 'success'}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      ) : null}

      {!canMutate ? (
        <Alert severity="info">
          Rol actual ({viewerRole}) sin permisos para crear o actualizar solicitudes. Puedes revisar adjuntos y
          comentarios existentes.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <TextField
              select
              label="Proyecto"
              size="small"
              value={selectedProjectId ?? ''}
              onChange={(event) => setSelectedProjectId(Number(event.target.value) || null)}
              sx={{ minWidth: { xs: '100%', md: 280 } }}
            >
              {boardData.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusFilter}
              onChange={(_event, value) => {
                if (value) {
                  setStatusFilter(value);
                }
              }}
            >
              {statusFilterOptions.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Box flexGrow={1} />

            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => {
                setCreateDialogOpen(true);
                setCreateError(null);
              }}
              disabled={!canMutate || !selectedProject}
            >
              Registrar solicitud
            </Button>
          </Stack>

          <Divider flexItem />

          {!selectedProject ? (
            <Typography variant="body2" color="text.secondary">
              Selecciona un proyecto para revisar las solicitudes registradas.
            </Typography>
          ) : filteredRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {statusFilter === 'ALL'
                ? 'Este proyecto aún no registra solicitudes de información.'
                : 'No hay solicitudes con el filtro seleccionado.'}
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {filteredRequests.map((request) => {
                const statusConfig = statusLabels[request.status];
                return (
                  <Paper
                    key={request.id}
                    data-testid={`data-request-${request.id}`}
                    variant="outlined"
                    sx={{ p: { xs: 2.5, md: 3 } }}
                  >
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {request.title}
                          </Typography>
                          {request.description ? (
                            <Typography variant="body2" color="text.secondary">
                              {request.description}
                            </Typography>
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            Registrada el {dateFormatter.format(new Date(request.createdAt))}
                          </Typography>
                          {request.dueDate ? (
                            <Typography variant="caption" color="text.secondary">
                              Fecha límite: {dateFormatter.format(new Date(request.dueDate))}
                            </Typography>
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Chip
                            label={statusConfig.label}
                            color={statusConfig.color}
                            variant="outlined"
                            size="small"
                          />
                          <TextField
                            select
                            label="Actualizar estado"
                            size="small"
                            value={request.status}
                            disabled={!canMutate || statusLoading[request.id]}
                            onChange={(event) =>
                              handleStatusChange(
                                selectedProject.id,
                                request,
                                event.target.value as DataRequestStatus
                              )
                            }
                            sx={{ minWidth: 180 }}
                          >
                            {(Object.keys(statusLabels) as DataRequestStatus[]).map((status) => (
                              <MenuItem
                                key={status}
                                value={status}
                                disabled={
                                  status !== request.status &&
                                  !allowedTransitions[request.status].includes(status)
                                }
                              >
                                {statusLabels[status].label}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            onClick={() => openAttachmentDialog(selectedProject.id, request.id)}
                          >
                            Agregar adjunto
                          </Button>
                        </Stack>
                      </Stack>

                      <Divider flexItem />

                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AttachmentIcon fontSize="small" color="action" />
                          <Typography variant="subtitle2">Adjuntos</Typography>
                        </Stack>
                        {request.attachments.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Aún no se han cargado adjuntos para esta solicitud.
                          </Typography>
                        ) : (
                          <List dense disablePadding>
                            {request.attachments.map((attachment) => (
                              <ListItem key={attachment.id} disableGutters sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <UploadFileIcon fontSize="small" color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                  primary={attachment.fileName}
                                  secondary={`Cargado el ${dateFormatter.format(new Date(attachment.uploadedAt))}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => (!createLoading ? setCreateDialogOpen(false) : undefined)}>
        <DialogTitle>Registrar solicitud</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Completa la información mínima para solicitar evidencia o documentación relevante.
          </Typography>
          <TextField
            label="Título"
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            autoFocus
            required
          />
          <TextField
            label="Descripción"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            multiline
            minRows={3}
          />
          <TextField
            label="Fecha límite"
            type="date"
            value={createDueDate}
            onChange={(event) => setCreateDueDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {createError ? (
            <Alert severity="error" onClose={() => setCreateError(null)}>
              {createError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => (!createLoading ? setCreateDialogOpen(false) : undefined)} disabled={createLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCreateRequest} variant="contained" disabled={createLoading}>
            {createLoading ? 'Guardando…' : 'Guardar solicitud'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(attachmentDialog)}
        onClose={() => (!attachmentLoading ? setAttachmentDialog(null) : undefined)}
      >
        <DialogTitle>Agregar adjunto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Ingresa un nombre descriptivo y pega el contenido relevante (por ejemplo, texto o un enlace codificado).
          </Typography>
          <TextField
            label="Nombre del archivo"
            value={attachmentName}
            onChange={(event) => setAttachmentName(event.target.value)}
            required
          />
          <TextField
            label="Contenido"
            value={attachmentContent}
            onChange={(event) => setAttachmentContent(event.target.value)}
            multiline
            minRows={4}
          />
          {attachmentError ? (
            <Alert severity="error" onClose={() => setAttachmentError(null)}>
              {attachmentError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => (!attachmentLoading ? setAttachmentDialog(null) : undefined)} disabled={attachmentLoading}>
            Cancelar
          </Button>
          <Button onClick={handleAttachmentSubmit} variant="contained" disabled={attachmentLoading}>
            {attachmentLoading ? 'Adjuntando…' : 'Guardar adjunto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default RequestBoard;
