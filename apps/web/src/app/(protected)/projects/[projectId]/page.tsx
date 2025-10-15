import { Fragment, type ReactElement } from 'react';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { fetchServerSession } from '@/lib/auth/server-session';
import prisma from '@backend/lib/prisma';
import {
  getProjectOverview,
  type ProjectOverview,
} from '@backend/services/projectService';
import type {
  ChecklistStatus,
  GovernanceCadence,
  GovernanceType,
  RiskLevel,
  RiskStatus,
} from '@backend/lib/prisma';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Box,
  Button,
  Chip,
  ChipProps,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
const numberFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

const trendConfig: Record<
  ProjectOverview['kpis'][number]['trend'],
  { label: string; color: ChipProps['color']; icon: ReactElement }
> = {
  UP: { label: 'En alza', color: 'success', icon: <ArrowUpwardIcon fontSize="small" /> },
  DOWN: { label: 'A la baja', color: 'error', icon: <ArrowDownwardIcon fontSize="small" /> },
  STABLE: { label: 'Estable', color: 'info', icon: <RemoveIcon fontSize="small" /> },
};

const severityConfig: Record<RiskLevel, { label: string; color: ChipProps['color'] }> = {
  LOW: { label: 'Impacto bajo', color: 'success' },
  MEDIUM: { label: 'Impacto medio', color: 'warning' },
  HIGH: { label: 'Impacto alto', color: 'error' },
};

const likelihoodConfig: Record<RiskLevel, { label: string; color: ChipProps['color'] }> = {
  LOW: { label: 'Probabilidad baja', color: 'success' },
  MEDIUM: { label: 'Probabilidad media', color: 'warning' },
  HIGH: { label: 'Probabilidad alta', color: 'error' },
};

const riskStatusConfig: Record<RiskStatus, { label: string; color: ChipProps['color'] }> = {
  OPEN: { label: 'Abierto', color: 'error' },
  IN_PROGRESS: { label: 'En progreso', color: 'warning' },
  RESOLVED: { label: 'Resuelto', color: 'success' },
};

const checklistStatusLabel: Record<ChecklistStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
};

const governanceCadenceLabels: Record<GovernanceCadence, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  AD_HOC: 'Ad hoc',
};

const governanceTypeLabels: Record<GovernanceType, string> = {
  STEERING_COMMITTEE: 'Comité de dirección',
  WORKING_GROUP: 'Equipo de trabajo',
  SPONSOR_CHECKIN: 'Seguimiento con sponsor',
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function formatRelativeDays(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY_IN_MS);
}

function formatChecklistDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return 'Sin fecha comprometida';
  }
  const date = new Date(dueDate);
  const diffDays = formatRelativeDays(date);
  if (diffDays > 0) {
    const suffix = diffDays === 1 ? 'día' : 'días';
    return `Vence en ${diffDays} ${suffix} (${dateFormatter.format(date)})`;
  }
  if (diffDays === 0) {
    return `Vence hoy (${dateFormatter.format(date)})`;
  }
  const suffix = diffDays === -1 ? 'día' : 'días';
  return `Vencido hace ${Math.abs(diffDays)} ${suffix} (${dateFormatter.format(date)})`;
}

function formatNextMeeting(nextMeetingAt: string | null): string {
  if (!nextMeetingAt) {
    return 'Sin próxima reunión agendada';
  }
  const date = new Date(nextMeetingAt);
  const diffDays = formatRelativeDays(date);
  if (diffDays > 0) {
    const suffix = diffDays === 1 ? 'día' : 'días';
    return `Próxima reunión en ${diffDays} ${suffix} (${dateFormatter.format(date)})`;
  }
  if (diffDays === 0) {
    return `Reunión hoy (${dateFormatter.format(date)})`;
  }
  const suffix = diffDays === -1 ? 'día' : 'días';
  return `La última reunión fue hace ${Math.abs(diffDays)} ${suffix} (${dateFormatter.format(date)})`;
}

function formatKpiValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${numberFormatter.format(value)}%`;
  }
  if (unit === 'count') {
    return `${numberFormatter.format(value)} ítems`;
  }
  return `${numberFormatter.format(value)} ${unit}`;
}

function getKpiProgress(current: number, target: number): {
  progressValue: number | null;
  progressLabel: string | null;
} {
  if (target <= 0) {
    return { progressValue: null, progressLabel: null };
  }
  const ratio = Math.round((current / target) * 100);
  return {
    progressValue: Math.min(Math.max(ratio, 0), 100),
    progressLabel: `${Math.max(ratio, 0)}% del objetivo`,
  };
}

function parseChecklistName(name: string): { label: string; framework: string | null } {
  const frameworkMatch = name.match(/^\[Framework: ([^\]]+)\]\s*(.*)$/);
  if (frameworkMatch) {
    return { framework: frameworkMatch[1], label: frameworkMatch[2] };
  }
  return { framework: null, label: name };
}

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const projectId = Number(params.projectId);
  if (!Number.isFinite(projectId)) {
    notFound();
  }

  const session = await fetchServerSession();
  if (!session) {
    notFound();
  }

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) {
    notFound();
  }

  let overview: ProjectOverview;
  try {
    overview = await getProjectOverview(projectId, actor);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Project not found' || error.message === 'Insufficient permissions')
    ) {
      notFound();
    }
    throw error;
  }

  const achievedKpis = overview.kpis.filter((kpi) => kpi.target > 0 && kpi.current >= kpi.target).length;

  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Button
          component={NextLink}
          href="/projects"
          variant="text"
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          Volver a proyectos
        </Button>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Overview
        </Typography>
        <Typography variant="h4">{overview.project.name}</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={640}>
          {overview.project.description ??
            'Este proyecto aún no tiene una descripción registrada. Completarla ayuda a contextualizar al equipo y a los stakeholders sobre el estado de la auditoría.'}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="h6">Indicadores clave</Typography>
            {overview.kpis.length > 0 && (
              <Chip
                label={`${achievedKpis}/${overview.kpis.length} objetivos alcanzados`}
                color={achievedKpis === overview.kpis.length ? 'success' : 'default'}
                size="small"
              />
            )}
          </Stack>

          {overview.kpis.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no se han configurado KPIs para este proyecto. Puedes registrar indicadores desde el backend para medir el avance de la auditoría.
            </Typography>
          ) : (
            <Grid container spacing={2.5}>
              {overview.kpis.map((kpi) => {
                const trend = trendConfig[kpi.trend];
                const { progressValue, progressLabel } = getKpiProgress(kpi.current, kpi.target);
                return (
                  <Grid item key={kpi.id} xs={12} md={6} lg={4}>
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2.5,
                        height: '100%',
                        bgcolor: 'background.default',
                      }}
                    >
                      <Stack spacing={1.5} height="100%">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="subtitle2" color="text.secondary">
                            {kpi.name}
                          </Typography>
                          <Chip size="small" color={trend.color} variant="outlined" icon={trend.icon} label={trend.label} />
                        </Stack>

                        <Stack spacing={0.5}>
                          <Typography variant="h4" component="div">
                            {formatKpiValue(kpi.current, kpi.unit)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Objetivo: {formatKpiValue(kpi.target, kpi.unit)}
                          </Typography>
                        </Stack>

                        {progressValue !== null && (
                          <Stack spacing={0.5} sx={{ mt: 'auto' }}>
                            <LinearProgress variant="determinate" value={progressValue} />
                            {progressLabel && (
                              <Typography variant="caption" color="text.secondary">
                                {progressLabel}
                              </Typography>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ p: 3.5, height: '100%' }}>
            <Stack spacing={3} height="100%">
              <Typography variant="h6">Checklist pendientes</Typography>
              {overview.pendingChecklists.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ¡Buen trabajo! No hay checklist pendientes. Cualquier nueva tarea que se programe aparecerá aquí ordenada por
                  fecha de vencimiento.
                </Typography>
              ) : (
                <List disablePadding>
                  {overview.pendingChecklists.map((item, index) => {
                    const parsed = parseChecklistName(item.name);
                    return (
                      <Fragment key={item.id}>
                        {index > 0 && <Divider component="li" sx={{ my: 1.5 }} />}
                        <ListItem alignItems="flex-start" disableGutters sx={{ py: 1.5 }}>
                          <Stack spacing={1} sx={{ flexGrow: 1, pr: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" fontWeight={600} component="span">
                                {parsed.label}
                              </Typography>
                              {parsed.framework && (
                                <Chip label={parsed.framework} size="small" variant="outlined" color="primary" />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatChecklistDueDate(item.dueDate)}
                            </Typography>
                          </Stack>
                          <Chip label={checklistStatusLabel[item.status]} size="small" color="warning" variant="outlined" />
                        </ListItem>
                      </Fragment>
                    );
                  })}
                </List>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ p: 3.5, height: '100%' }}>
            <Stack spacing={3} height="100%">
              <Typography variant="h6">Riesgos prioritarios</Typography>
              {overview.topRisks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Los riesgos registrados se mostrarán aquí priorizados por severidad y probabilidad. Usa este bloque para darle
                  seguimiento a las mitigaciones clave.
                </Typography>
              ) : (
                <Stack spacing={2.5} divider={<Divider flexItem />}>
                  {overview.topRisks.map((risk) => {
                    const severity = severityConfig[risk.severity];
                    const likelihood = likelihoodConfig[risk.likelihood];
                    const status = riskStatusConfig[risk.status];
                    return (
                      <Stack key={risk.id} spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                            {risk.title}
                          </Typography>
                          <Chip size="small" color={status.color} label={status.label} />
                        </Stack>
                        {risk.description && (
                          <Typography variant="body2" color="text.secondary">
                            {risk.description}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" variant="outlined" color={severity.color} label={severity.label} />
                          <Chip size="small" variant="outlined" color={likelihood.color} label={likelihood.label} />
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          <Typography variant="h6">Gobernanza y comités</Typography>
          {overview.governance.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Los eventos de gobernanza se listarán aquí con su frecuencia y responsables. Agrega los comités clave desde el bac
              kend para mantener un seguimiento visible.
            </Typography>
          ) : (
            <List disablePadding>
              {overview.governance.map((event, index) => (
                <Fragment key={event.id}>
                  {index > 0 && <Divider component="li" sx={{ my: 1.5 }} />}
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <Stack spacing={1} sx={{ flexGrow: 1 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Typography variant="body2" fontWeight={600} component="span">
                          {event.name}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            size="small"
                            variant="outlined"
                            color="secondary"
                            label={governanceTypeLabels[event.type]}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            color="info"
                            label={governanceCadenceLabels[event.cadence]}
                          />
                        </Stack>
                      </Stack>
                      <Typography variant="body2">
                        Responsable: <strong>{event.owner}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNextMeeting(event.nextMeetingAt)}
                      </Typography>
                    </Stack>
                  </ListItem>
                </Fragment>
              ))}
            </List>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
