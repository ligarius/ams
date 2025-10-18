import { Fragment, type ReactElement } from 'react';
import NextLink from 'next/link';
import { headers, cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ProjectOverview } from '@backend/services/projectService';
import type {
  ApprovalStatus,
  ChecklistStatus,
  DataRequestStatus,
  FindingStatus,
  GovernanceCadence,
  GovernanceType,
  RiskLevel,
  RiskStatus,
  SignatureStatus,
} from '@backend/lib/prisma';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RemoveIcon from '@mui/icons-material/Remove';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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

const urgencyConfig: Record<RiskLevel, { label: string; color: ChipProps['color'] }> = {
  LOW: { label: 'Urgencia baja', color: 'success' },
  MEDIUM: { label: 'Urgencia media', color: 'warning' },
  HIGH: { label: 'Urgencia alta', color: 'error' },
};

const complexityConfig: Record<RiskLevel, { label: string; color: ChipProps['color'] }> = {
  LOW: { label: 'Complejidad baja', color: 'success' },
  MEDIUM: { label: 'Complejidad media', color: 'warning' },
  HIGH: { label: 'Complejidad alta', color: 'error' },
};

const riskLevelLabel: Record<RiskLevel, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

const scoreFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const prioritizationLevels: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW'];

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

const dataRequestStatusLabels: Record<DataRequestStatus, { label: string; color: ChipProps['color'] }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  IN_REVIEW: { label: 'En revisión', color: 'info' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'default' },
};

const findingStatusLabels: Record<FindingStatus, { label: string; color: ChipProps['color'] }> = {
  OPEN: { label: 'Abierto', color: 'error' },
  IN_REVIEW: { label: 'En revisión', color: 'warning' },
  RESOLVED: { label: 'Cerrado', color: 'success' },
};

const approvalStatusLabels: Record<ApprovalStatus, { label: string; color: ChipProps['color'] }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const signatureStatusLabels: Record<SignatureStatus, { label: string; color: ChipProps['color'] }> = {
  PENDING: { label: 'Preparando firma', color: 'default' },
  SENT: { label: 'Enviada', color: 'info' },
  SIGNED: { label: 'Firmada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const signatureStatusOrder: SignatureStatus[] = ['PENDING', 'SENT', 'SIGNED', 'REJECTED'];

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const getBaseUrl = () => {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host) {
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!fallback) {
    throw new Error('Unable to determine host for project overview fetch');
  }
  return fallback.replace(/\/$/, '');
};

const buildCookieHeader = () => {
  const cookieStore = cookies();
  const entries = cookieStore.getAll();
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(({ name, value }) => `${name}=${value}`).join('; ');
};

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

function describeSignatureStatus(approval: ProjectOverview['approvals']['recent'][number]): string {
  switch (approval.signatureStatus) {
    case 'SIGNED':
      return approval.signatureCompletedAt
        ? `Firmada el ${dateFormatter.format(new Date(approval.signatureCompletedAt))}`
        : 'Firma completada';
    case 'SENT':
      return approval.signatureSentAt
        ? `Enviada para firma el ${dateFormatter.format(new Date(approval.signatureSentAt))}`
        : 'Solicitud de firma enviada';
    case 'REJECTED':
      return approval.signatureDeclinedAt
        ? `Firma rechazada el ${dateFormatter.format(new Date(approval.signatureDeclinedAt))}`
        : 'Firma rechazada por el destinatario';
    default:
      return 'Documento en preparación para firma';
  }
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

  const baseUrl = getBaseUrl();
  const cookieHeader = buildCookieHeader();
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/overview`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch project overview: ${response.status}`);
  }

  const overview = (await response.json()) as ProjectOverview;

  const achievedKpis = overview.kpis.filter((kpi) => kpi.target > 0 && kpi.current >= kpi.target).length;
  const prioritizedRisks = overview.prioritization.ordered;
  const topPrioritized = prioritizedRisks.slice(0, 3);

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

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2.5} height="100%">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <DescriptionIcon color="primary" />
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Solicitudes de información
                    </Typography>
                    <Typography variant="h5">{overview.dataRequests.total}</Typography>
                  </Stack>
                </Stack>
                <Chip
                  size="small"
                  color={overview.dataRequests.overdue > 0 ? 'error' : 'default'}
                  variant={overview.dataRequests.overdue > 0 ? 'filled' : 'outlined'}
                  label={
                    overview.dataRequests.overdue > 0
                      ? `${overview.dataRequests.overdue} atrasadas`
                      : 'Sin atrasos'
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {overview.dataRequests.nextDue
                  ? `Próxima entrega: ${dateFormatter.format(new Date(overview.dataRequests.nextDue))}`
                  : 'Aún no hay próximas entregas planificadas.'}
              </Typography>
              <Grid container spacing={1.5} columns={{ xs: 12, sm: 24 }}>
                {(Object.keys(dataRequestStatusLabels) as Array<DataRequestStatus>).map((status) => {
                  const config = dataRequestStatusLabels[status];
                  return (
                    <Grid item xs={12} sm={12} md={8} key={status}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {config.label}
                        </Typography>
                        <Chip
                          size="small"
                          color={config.color}
                          variant="outlined"
                          label={`${overview.dataRequests.byStatus[status]} registros`}
                        />
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} height="100%">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <WarningAmberIcon color="warning" />
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Hallazgos pendientes
                  </Typography>
                  <Typography variant="h5">{overview.outstandingFindings.length}</Typography>
                </Stack>
              </Stack>
              {overview.outstandingFindings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay hallazgos abiertos. Los nuevos registros aparecerán aquí con su estado y riesgo asociado.
                </Typography>
              ) : (
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {overview.outstandingFindings.slice(0, 3).map((finding) => {
                    const config = findingStatusLabels[finding.status];
                    return (
                      <Stack key={finding.id} spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                            {finding.title}
                          </Typography>
                          <Chip size="small" label={config.label} color={config.color} variant="outlined" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {finding.riskTitle ? `Asociado a: ${finding.riskTitle}` : 'Riesgo no especificado'}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} height="100%">
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <GavelIcon color="action" />
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Cambios de alcance
                    </Typography>
                    <Typography variant="h5">{overview.approvals.pending}</Typography>
                  </Stack>
                </Stack>
                <Chip size="small" variant="outlined" label="Pendientes" color="warning" />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {signatureStatusOrder.map((status) => {
                  const config = signatureStatusLabels[status];
                  return (
                    <Chip
                      key={status}
                      size="small"
                      color={config.color}
                      variant="outlined"
                      label={`${config.label}: ${overview.approvals.signature[status]}`}
                    />
                  );
                })}
              </Stack>
              {overview.approvals.recent.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aún no se han registrado aprobaciones. Los flujos creados desde el backend aparecerán aquí.
                </Typography>
              ) : (
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {overview.approvals.recent.slice(0, 3).map((approval) => {
                    const config = approvalStatusLabels[approval.status];
                    const signatureConfig = signatureStatusLabels[approval.signatureStatus];
                    return (
                      <Stack key={approval.id} spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                            {approval.title}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                            <Chip size="small" label={config.label} color={config.color} variant="outlined" />
                            <Chip
                              size="small"
                              label={signatureConfig.label}
                              color={signatureConfig.color}
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              {approval.decidedAt
                                ? `Decidido el ${dateFormatter.format(new Date(approval.decidedAt))}`
                                : 'En espera de decisión'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {describeSignatureStatus(approval)}
                            </Typography>
                          </Stack>
                          {approval.signatureUrl ? (
                            <Button
                              size="small"
                              variant="contained"
                              component="a"
                              href={approval.signatureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Firmar documento
                            </Button>
                          ) : null}
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
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3.5, height: '100%' }}>
            <Stack spacing={3} height="100%">
              <Typography variant="h6">Riesgos prioritarios</Typography>
              {prioritizedRisks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Los riesgos registrados se mostrarán aquí priorizados por impacto, urgencia y complejidad. A medida que se
                  agreguen nuevos riesgos, verás los más críticos junto a su puntaje combinado.
                </Typography>
              ) : (
                <Stack spacing={3} divider={<Divider flexItem />}>
                  {topPrioritized.map((risk) => {
                    const status = riskStatusConfig[risk.status];
                    const severity = severityConfig[risk.severity];
                    const urgency = urgencyConfig[risk.urgency];
                    const complexity = complexityConfig[risk.complexity];
                    const likelihood = likelihoodConfig[risk.likelihood];
                    return (
                      <Stack key={risk.id} spacing={2}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          spacing={1.5}
                        >
                          <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                            {risk.title}
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ sm: 'center' }}>
                            <Chip
                              size="small"
                              color="primary"
                              label={`Puntaje ${scoreFormatter.format(risk.score)}`}
                            />
                            <Chip size="small" color={status.color} label={status.label} />
                          </Stack>
                        </Stack>
                        <Grid container spacing={1.5} columns={{ xs: 12, sm: 24 }}>
                          <Grid item xs={12} sm={12} md={6}>
                            <Stack spacing={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                Impacto
                              </Typography>
                              <Chip size="small" variant="outlined" color={severity.color} label={severity.label} />
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={12} md={6}>
                            <Stack spacing={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                Probabilidad
                              </Typography>
                              <Chip size="small" variant="outlined" color={likelihood.color} label={likelihood.label} />
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={12} md={6}>
                            <Stack spacing={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                Urgencia
                              </Typography>
                              <Chip size="small" variant="outlined" color={urgency.color} label={urgency.label} />
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={12} md={6}>
                            <Stack spacing={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                Complejidad
                              </Typography>
                              <Chip size="small" variant="outlined" color={complexity.color} label={complexity.label} />
                            </Stack>
                          </Grid>
                        </Grid>
                      </Stack>
                    );
                  })}
                </Stack>
              )}

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Matriz impacto vs. urgencia
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  La puntuación pondera el impacto y la urgencia, favoreciendo riesgos con menor complejidad para priorizar
                  remediaciones rápidas.
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(4, minmax(180px, 1fr))', md: 'repeat(4, minmax(160px, 1fr))' },
                      gap: 1,
                      minWidth: { xs: 720, md: 640 },
                    }}
                  >
                    <Box sx={{ p: 1 }} />
                    {prioritizationLevels.map((urgency) => (
                      <Box
                        key={`urgency-header-${urgency}`}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Urgencia
                        </Typography>
                        <Typography variant="subtitle2">{riskLevelLabel[urgency]}</Typography>
                      </Box>
                    ))}
                    {prioritizationLevels.map((impact) => (
                      <Fragment key={`impact-row-${impact}`}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Impacto
                          </Typography>
                          <Typography variant="subtitle2">{riskLevelLabel[impact]}</Typography>
                        </Box>
                        {prioritizationLevels.map((urgency) => {
                          const items = overview.prioritization.matrix[impact][urgency];
                          return (
                            <Box
                              key={`${impact}-${urgency}`}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 1.5,
                                minHeight: 112,
                                bgcolor: 'background.paper',
                              }}
                            >
                              {items.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                  Sin registros
                                </Typography>
                              ) : (
                                <Stack spacing={1.25}>
                                  {items.map((item) => {
                                    const complexity = complexityConfig[item.complexity];
                                    const status = riskStatusConfig[item.status];
                                    return (
                                      <Stack key={item.id} spacing={0.75}>
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                          <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            sx={{ wordBreak: 'break-word' }}
                                          >
                                            {item.title}
                                          </Typography>
                                          <Chip
                                            size="small"
                                            color="primary"
                                            label={`Puntaje ${scoreFormatter.format(item.score)}`}
                                          />
                                        </Stack>
                                        <Stack direction="row" spacing={0.5} flexWrap useFlexGap>
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            color={complexity.color}
                                            label={complexity.label}
                                          />
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            color={status.color}
                                            label={status.label}
                                          />
                                        </Stack>
                                      </Stack>
                                    );
                                  })}
                                </Stack>
                              )}
                            </Box>
                          );
                        })}
                      </Fragment>
                    ))}
                  </Box>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
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
