'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { InitiativeWithAssignments } from '@backend/services/initiativeService';

const typeOptions = [
  { value: 'QUICK_WIN', label: 'Quick win' },
  { value: 'POC', label: 'Prueba de concepto' },
  { value: 'PROJECT', label: 'Proyecto' },
] as const;

const statusOptions = [
  { value: 'PLANNED', label: 'Planificada' },
  { value: 'IN_PROGRESS', label: 'En ejecución' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'ON_HOLD', label: 'En pausa' },
] as const;

type InitiativeFormProps = {
  projectId: number;
  initiative?: InitiativeWithAssignments;
};

type AssignmentRow = {
  userId: string;
  role: string;
  allocationPercentage: string;
};

const formatDateValue = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '';
  }
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().slice(0, 10);
};

export function InitiativeForm({ projectId, initiative }: InitiativeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initiative?.title ?? '');
  const [description, setDescription] = useState(initiative?.description ?? '');
  const [type, setType] = useState<InitiativeWithAssignments['type']>(initiative?.type ?? 'QUICK_WIN');
  const [status, setStatus] = useState<InitiativeWithAssignments['status']>(initiative?.status ?? 'PLANNED');
  const [resourceSummary, setResourceSummary] = useState(initiative?.resourceSummary ?? '');
  const [startDate, setStartDate] = useState(formatDateValue(initiative?.startDate));
  const [endDate, setEndDate] = useState(formatDateValue(initiative?.endDate));
  const [estimatedBudget, setEstimatedBudget] = useState(
    initiative?.estimatedBudget !== null && initiative?.estimatedBudget !== undefined
      ? String(initiative.estimatedBudget)
      : ''
  );
  const [assignments, setAssignments] = useState<AssignmentRow[]>(
    initiative?.assignments.length
      ? initiative.assignments.map((assignment) => ({
          userId: String(assignment.userId),
          role: assignment.role,
          allocationPercentage: String(assignment.allocationPercentage),
        }))
      : []
  );
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const isEdit = Boolean(initiative);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && resourceSummary.trim().length >= 3 && startDate.length > 0 && endDate.length > 0;
  }, [title, resourceSummary, startDate, endDate]);

  const handleSubmit = async () => {
    if (submitting || !canSubmit) {
      return;
    }
    setSubmitting(true);
    setServerError(null);
    setServerSuccess(null);

    const payloadAssignments = assignments
      .map((assignment) => ({
        userId: Number(assignment.userId),
        role: assignment.role.trim(),
        allocationPercentage: Number(assignment.allocationPercentage || '0'),
      }))
      .filter((assignment) => !Number.isNaN(assignment.userId) && assignment.role.length > 0);

    const parsedBudget = estimatedBudget === '' ? null : Number(estimatedBudget);
    const sanitizedBudget = parsedBudget !== null && Number.isNaN(parsedBudget) ? null : parsedBudget;

    const endpoint = isEdit
      ? `/api/projects/${projectId}/initiatives/${initiative!.id}`
      : `/api/projects/${projectId}/initiatives`;

    const method = isEdit ? 'PATCH' : 'POST';
    const body = {
      title: title.trim(),
      description: description.trim().length ? description.trim() : undefined,
      type,
      status,
      resourceSummary: resourceSummary.trim(),
      startDate,
      endDate,
      estimatedBudget: sanitizedBudget,
      assignments: payloadAssignments,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setServerError(errorBody?.message ?? 'No fue posible guardar la iniciativa.');
        return;
      }

      setServerSuccess(isEdit ? 'Iniciativa actualizada correctamente.' : 'Iniciativa creada correctamente.');
      if (!isEdit) {
        const created = await response.json();
        router.replace(`/projects/${projectId}/initiatives/${created.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to persist initiative', error);
      setServerError('Ocurrió un error inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || submitting) {
      return;
    }
    setSubmitting(true);
    setServerError(null);
    setServerSuccess(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/initiatives/${initiative!.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setServerError(errorBody?.message ?? 'No fue posible eliminar la iniciativa.');
        return;
      }
      router.push(`/projects/${projectId}/initiatives`);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete initiative', error);
      setServerError('Ocurrió un error inesperado al eliminar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {isEdit ? 'Editar iniciativa' : 'Registrar iniciativa'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define los recursos, plazos y responsables que materializan la iniciativa dentro del proyecto.
          </Typography>
        </Box>

        {serverError && (
          <Alert severity="error" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {serverSuccess && (
          <Alert severity="success" onClose={() => setServerSuccess(null)}>
            {serverSuccess}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              label="Título"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Tipo" select fullWidth value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Descripción"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Estado"
              select
              fullWidth
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Presupuesto estimado"
              type="number"
              fullWidth
              value={estimatedBudget}
              onChange={(event) => setEstimatedBudget(event.target.value)}
              InputProps={{ inputProps: { min: 0, step: 500 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Recursos comprometidos"
              value={resourceSummary}
              onChange={(event) => setResourceSummary(event.target.value)}
              required
              multiline
              minRows={3}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Fecha de inicio"
              type="date"
              fullWidth
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Fecha de término"
              type="date"
              fullWidth
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={600}>
              Responsables y dedicación
            </Typography>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setAssignments((items) => [...items, { userId: '', role: '', allocationPercentage: '0' }])}
            >
              Agregar responsable
            </Button>
          </Stack>
          {assignments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Añade los usuarios responsables para visibilizar la capacidad comprometida en la iniciativa.
            </Typography>
          )}
          <Stack spacing={2}>
            {assignments.map((assignment, index) => (
              <Paper key={`${assignment.userId}-${index}`} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Usuario (ID)"
                      type="number"
                      fullWidth
                      value={assignment.userId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAssignments((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  userId: value,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="Rol"
                      fullWidth
                      value={assignment.role}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAssignments((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  role: value,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={10} md={3}>
                    <TextField
                      label="Dedicación %"
                      type="number"
                      fullWidth
                      value={assignment.allocationPercentage}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAssignments((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  allocationPercentage: value,
                                }
                              : item
                          )
                        );
                      }}
                      InputProps={{ inputProps: { min: 0, max: 200, step: 5 } }}
                    />
                  </Grid>
                  <Grid item xs={2} md={1} display="flex" justifyContent="flex-end">
                    <IconButton
                      aria-label="Eliminar responsable"
                      onClick={() => setAssignments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Button component={NextLink} href={`/projects/${projectId}/initiatives`} variant="text">
              Volver al listado
            </Button>
            {isEdit && (
              <Button color="error" variant="outlined" onClick={handleDelete} disabled={submitting}>
                Eliminar iniciativa
              </Button>
            )}
          </Stack>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {isEdit ? 'Guardar cambios' : 'Crear iniciativa'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
