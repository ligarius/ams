import NextLink from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import type { InitiativeWithAssignments } from '@backend/services/initiativeService';

const typeLabels: Record<InitiativeWithAssignments['type'], string> = {
  QUICK_WIN: 'Quick win',
  POC: 'Prueba de concepto',
  PROJECT: 'Proyecto estratégico',
};

const statusConfig: Record<
  InitiativeWithAssignments['status'],
  { label: string; color: 'default' | 'primary' | 'warning' | 'success' | 'info' }
> = {
  PLANNED: { label: 'Planificada', color: 'info' },
  IN_PROGRESS: { label: 'En ejecución', color: 'warning' },
  COMPLETED: { label: 'Completada', color: 'success' },
  ON_HOLD: { label: 'En pausa', color: 'default' },
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

const buildBaseUrl = () => {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host) {
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!fallback) {
    throw new Error('Unable to determine host for initiatives fetch');
  }
  return fallback.replace(/\/$/, '');
};

const buildCookieHeader = () => {
  const store = cookies();
  const entries = store.getAll();
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(({ name, value }) => `${name}=${value}`).join('; ');
};

const formatDate = (value: string | Date) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }
  return dateFormatter.format(parsed);
};

const totalAllocation = (initiative: InitiativeWithAssignments) =>
  initiative.assignments.reduce((total, assignment) => total + assignment.allocationPercentage, 0);

interface InitiativesPageProps {
  params: { projectId: string };
}

export default async function ProjectInitiativesPage({ params }: InitiativesPageProps) {
  const projectId = Number(params.projectId);
  if (Number.isNaN(projectId)) {
    notFound();
  }

  const baseUrl = buildBaseUrl();
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/initiatives`, {
    headers: {
      Cookie: buildCookieHeader() ?? '',
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('No fue posible obtener las iniciativas del proyecto');
  }

  const initiatives = (await response.json()) as InitiativeWithAssignments[];

  return (
    <Stack spacing={3} sx={{ p: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Iniciativas del proyecto
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualiza y gestiona los esfuerzos planificados, validando disponibilidad y presupuestos comprometidos.
          </Typography>
        </Box>
        <Button component={NextLink} href={`/projects/${projectId}/initiatives/new`} variant="contained">
          Registrar iniciativa
        </Button>
      </Stack>

      {initiatives.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 4 }}>
          <Stack spacing={1} alignItems="flex-start">
            <Typography variant="h6" fontWeight={600}>
              Aún no hay iniciativas registradas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comienza planificando quick wins, pruebas de concepto o proyectos estratégicos para organizar los recursos.
            </Typography>
            <Button component={NextLink} href={`/projects/${projectId}/initiatives/new`} variant="outlined">
              Crear la primera iniciativa
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {initiatives.map((initiative) => {
            const status = statusConfig[initiative.status];
            return (
              <Grid item xs={12} md={6} key={initiative.id}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 4 }}>
                  <Stack spacing={2} height="100%">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Chip label={typeLabels[initiative.type]} color="primary" size="small" />
                      <Chip label={status.label} color={status.color} size="small" />
                    </Stack>
                    <Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {initiative.title}
                      </Typography>
                      {initiative.description && (
                        <Typography variant="body2" color="text.secondary">
                          {initiative.description}
                        </Typography>
                      )}
                    </Box>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Recursos: {initiative.resourceSummary}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Presupuesto estimado:{' '}
                        {initiative.estimatedBudget ? `$${initiative.estimatedBudget.toLocaleString('es-ES')}` : 'No definido'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Duración: {formatDate(initiative.startDate)} → {formatDate(initiative.endDate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dedicación total asignada: {totalAllocation(initiative)}%
                      </Typography>
                    </Stack>
                    {initiative.assignments.length > 0 && (
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Responsables
                        </Typography>
                        {initiative.assignments.map((assignment) => (
                          <Typography key={assignment.id} variant="body2" color="text.secondary">
                            Usuario #{assignment.userId} · {assignment.role} · {assignment.allocationPercentage}%
                          </Typography>
                        ))}
                      </Stack>
                    )}
                    <Button component={NextLink} href={`/projects/${projectId}/initiatives/${initiative.id}`} variant="outlined">
                      Editar iniciativa
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}
