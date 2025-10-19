import { differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';
import prisma, {
  BenchmarkFeedback,
  BenchmarkInsightRecord,
  BenchmarkSnapshot,
  ConnectorSyncRun,
  DataRequest,
  Finding,
  Project,
  ProjectRisk,
  StaffingAssignment,
  TemplateUsage,
  User,
} from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';

const feedbackSchema = z.object({
  usefulness: z.number().min(1).max(5),
  confidence: z.number().min(1).max(5),
  comment: z.string().trim().min(3).max(500).optional(),
});

export interface BenchmarkInsight extends BenchmarkInsightRecord {}

export interface BenchmarkMetrics {
  riskScore: number;
  unresolvedRisks: number;
  pendingDataRequests: number;
  averagePendingDays: number;
  averageCompletionDays: number | null;
  remediationRate: number;
  averageResolutionDays: number | null;
  templateReuse: number;
  templateAverageRating: number | null;
  staffingUtilization: number;
  billableHours: number;
  connectorCoverage: number;
  connectedConnectors: number;
  totalConnectors: number;
  datasetFreshnessDays: number | null;
}

export interface BenchmarkPortfolioSnapshot {
  medianRiskScore: number;
  topQuartileRiskScore: number;
  percentile: number;
  averageTemplateReuse: number;
  averageUtilization: number;
  averageCoverage: number;
}

export interface BenchmarkReport {
  project: { id: number; name: string };
  generatedAt: string;
  metrics: BenchmarkMetrics;
  portfolio: BenchmarkPortfolioSnapshot;
  insights: BenchmarkInsight[];
  snapshotId: number;
}

const trendMetrics = [
  { key: 'riskScore', label: 'Risk score', orientation: 'LOWER_IS_BETTER' as const },
  { key: 'pendingDataRequests', label: 'Pending data requests', orientation: 'LOWER_IS_BETTER' as const },
  { key: 'remediationRate', label: 'Remediation rate (%)', orientation: 'HIGHER_IS_BETTER' as const },
  { key: 'staffingUtilization', label: 'Staffing utilization', orientation: 'HIGHER_IS_BETTER' as const },
  { key: 'connectorCoverage', label: 'Connector coverage', orientation: 'HIGHER_IS_BETTER' as const },
] as const;

const leaderboardMetrics = [
  { key: 'remediationRate', label: 'Remediation rate (%)', higherIsBetter: true },
  { key: 'riskScore', label: 'Risk score', higherIsBetter: false },
  { key: 'pendingDataRequests', label: 'Pending data requests', higherIsBetter: false },
  { key: 'staffingUtilization', label: 'Staffing utilization', higherIsBetter: true },
  { key: 'connectorCoverage', label: 'Connector coverage', higherIsBetter: true },
  { key: 'templateReuse', label: 'Template reuse', higherIsBetter: true },
] as const;

type TrendMetricKey = (typeof trendMetrics)[number]['key'];
type LeaderboardMetricKey = (typeof leaderboardMetrics)[number]['key'];

export type TrendOrientation = (typeof trendMetrics)[number]['orientation'];
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT';

export interface BenchmarkTrendMetricSummary {
  key: TrendMetricKey;
  label: string;
  orientation: TrendOrientation;
  latest: number;
  previous: number | null;
  change: number | null;
  direction: TrendDirection;
  isImproving: boolean | null;
}

export interface BenchmarkTrendPoint {
  snapshotId: number;
  generatedAt: string;
  metrics: BenchmarkMetrics;
  portfolio: BenchmarkPortfolioSnapshot | null;
}

export interface BenchmarkTrendReport {
  project: { id: number; name: string };
  series: BenchmarkTrendPoint[];
  metrics: BenchmarkTrendMetricSummary[];
  window: { start: string | null; end: string | null; totalSnapshots: number };
  momentum: { improving: number; declining: number; score: number };
}

export interface BenchmarkLeaderboardEntry {
  rank: number;
  project: { id: number; name: string };
  value: number;
  previous: number | null;
  change: number | null;
  direction: TrendDirection;
  isImproving: boolean | null;
}

export interface BenchmarkLeaderboard {
  generatedAt: string;
  metric: { key: LeaderboardMetricKey; label: string; higherIsBetter: boolean };
  entries: BenchmarkLeaderboardEntry[];
}

const leaderboardSchema = z.object({
  metric: z.enum(leaderboardMetrics.map((item) => item.key) as [LeaderboardMetricKey, ...LeaderboardMetricKey[]]),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

interface PortfolioEntry {
  project: Project;
  metrics: BenchmarkMetrics;
}

const riskWeight: Record<ProjectRisk['severity'], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const levelWeight: Record<ProjectRisk['urgency'], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const computeRiskScore = (risks: ProjectRisk[]): number => {
  if (risks.length === 0) {
    return 0;
  }
  const severityAverage = risks.reduce((total, risk) => total + riskWeight[risk.severity], 0) / risks.length;
  const urgencyAverage = risks.reduce((total, risk) => total + levelWeight[risk.urgency], 0) / risks.length;
  const complexityAverage = risks.reduce((total, risk) => total + levelWeight[risk.complexity], 0) / risks.length;
  const normalize = (value: number) => (value - 1) / 2;
  const blended =
    normalize(severityAverage) * 0.5 + normalize(urgencyAverage) * 0.3 + normalize(complexityAverage) * 0.2;
  return Math.round(blended * 100);
};

const computeDataRequestMetrics = (requests: DataRequest[]) => {
  const pending = requests.filter((request) => request.status !== 'APPROVED');
  const approved = requests.filter((request) => request.status === 'APPROVED');
  const averagePendingDays =
    pending.length === 0
      ? 0
      : pending.reduce((total, request) => total + differenceInCalendarDays(new Date(), request.createdAt), 0) /
        pending.length;
  const completionDays = approved
    .map((request) => differenceInCalendarDays(request.updatedAt, request.createdAt))
    .filter((value) => Number.isFinite(value) && value >= 0);
  return {
    pendingCount: pending.length,
    averagePendingDays: Number(averagePendingDays.toFixed(2)),
    averageCompletionDays:
      completionDays.length === 0 ? null : Number((completionDays.reduce((a, b) => a + b, 0) / completionDays.length).toFixed(2)),
  };
};

const computeFindingMetrics = (findings: Finding[]) => {
  if (findings.length === 0) {
    return { remediationRate: 0, averageResolutionDays: null };
  }
  const resolved = findings.filter((finding) => finding.status === 'RESOLVED');
  const remediationRate = Number(((resolved.length / findings.length) * 100).toFixed(2));
  const resolutionTimes = resolved
    .map((finding) => differenceInCalendarDays(finding.updatedAt, finding.createdAt))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const averageResolutionDays =
    resolutionTimes.length === 0
      ? null
      : Number((resolutionTimes.reduce((total, days) => total + days, 0) / resolutionTimes.length).toFixed(2));
  return { remediationRate, averageResolutionDays };
};

const computeTemplateMetrics = (usages: TemplateUsage[]) => {
  if (usages.length === 0) {
    return { reuse: 0, rating: null };
  }
  const ratings = usages.map((usage) => usage.rating).filter((rating): rating is number => rating !== null);
  const rating = ratings.length === 0 ? null : Number((ratings.reduce((total, value) => total + value, 0) / ratings.length).toFixed(2));
  return { reuse: usages.length, rating };
};

const computeStaffingMetrics = (assignments: StaffingAssignment[]) => {
  if (assignments.length === 0) {
    return { utilization: 0, billableHours: 0 };
  }
  const activeAssignments = assignments.filter((assignment) => !assignment.endDate || assignment.endDate >= new Date());
  const totalCapacity = activeAssignments.reduce((total, assignment) => total + assignment.hoursPerWeek, 0);
  const billableHours = activeAssignments
    .filter((assignment) => assignment.billable)
    .reduce((total, assignment) => total + assignment.hoursPerWeek, 0);
  if (totalCapacity === 0) {
    return { utilization: 0, billableHours: Number(billableHours.toFixed(2)) };
  }
  return {
    utilization: Number((billableHours / totalCapacity).toFixed(2)),
    billableHours: Number(billableHours.toFixed(2)),
  };
};

const computeConnectorMetrics = (runs: ConnectorSyncRun[]) => {
  const connectors = prisma.integrationConnector.findMany();
  return connectors.then((records) => {
    const connected = records.filter((connector) => connector.status === 'CONNECTED').length;
    const coverage = records.length === 0 ? 0 : Number((connected / records.length).toFixed(2));
    const latestRun = runs.sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())[0];
    const datasetFreshnessDays = latestRun
      ? differenceInCalendarDays(new Date(), latestRun.finishedAt)
      : null;
    return {
      connected,
      total: records.length,
      coverage,
      datasetFreshnessDays,
    };
  });
};

const buildInsights = (
  metrics: BenchmarkMetrics,
  portfolio: BenchmarkPortfolioSnapshot,
  project: Project
): BenchmarkInsight[] => {
  const insights: BenchmarkInsight[] = [];
  if (metrics.riskScore > portfolio.medianRiskScore) {
    insights.push({
      id: 'risk-hotspot',
      title: 'Riesgo por encima del promedio del portafolio',
      description:
        'Concentra esfuerzos en mitigar riesgos críticos y reducir el backlog de hallazgos abiertos para alinearte al benchmark.',
      impact: Number((metrics.riskScore - portfolio.medianRiskScore).toFixed(2)),
      tags: ['riesgos', 'gobernanza'],
    });
  }
  if (metrics.templateReuse < portfolio.averageTemplateReuse) {
    insights.push({
      id: 'template-adoption',
      title: 'Aprovechar plantillas reutilizables para acelerar entregables',
      description:
        'El uso de plantillas se encuentra por debajo del promedio del portafolio. Vincula iniciativas y tableros a plantillas curadas para elevar la consistencia.',
      impact: Number((portfolio.averageTemplateReuse - metrics.templateReuse).toFixed(2)),
      tags: ['reutilizacion', 'playbooks'],
    });
  }
  if (metrics.staffingUtilization < portfolio.averageUtilization) {
    insights.push({
      id: 'utilization-gap',
      title: 'Revisar asignaciones y disponibilidad del equipo',
      description:
        'La utilización actual está por debajo del promedio. Ajusta asignaciones y refuerza la célula de trabajo para cumplir hitos.',
      impact: Number((portfolio.averageUtilization - metrics.staffingUtilization).toFixed(2)),
      tags: ['operacion', 'staffing'],
    });
  }
  if (metrics.connectorCoverage < portfolio.averageCoverage) {
    insights.push({
      id: 'integration-opportunity',
      title: 'Integraciones empresariales con margen de mejora',
      description:
        'Activa conectores pendientes para obtener datos frescos de ERP/CRM y alimentar tableros de seguimiento del cliente.',
      impact: Number((portfolio.averageCoverage - metrics.connectorCoverage).toFixed(2)),
      tags: ['integraciones', 'analytics'],
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: 'leading-indicator',
      title: 'Proyecto líder en el benchmark',
      description: `El proyecto ${project.name} se encuentra en el cuartil superior del portafolio. Mantén la disciplina actual de seguimiento y comparte mejores prácticas.`,
      impact: 0,
      tags: ['benchmarking'],
    });
  }
  return insights;
};

const calculatePercentile = (value: number, population: number[]): number => {
  if (population.length === 0) {
    return 0;
  }
  const sorted = [...population].sort((a, b) => a - b);
  const rank = sorted.findIndex((entry) => entry >= value);
  const position = rank === -1 ? sorted.length : rank + 1;
  return Number(((position / sorted.length) * 100).toFixed(2));
};

const summarizePortfolio = (entries: PortfolioEntry[], targetProjectId: number): BenchmarkPortfolioSnapshot => {
  const riskScores = entries.map((entry) => entry.metrics.riskScore).sort((a, b) => a - b);
  const midpoint = Math.floor(riskScores.length / 2);
  const median =
    riskScores.length === 0
      ? 0
      : riskScores.length % 2 === 0
        ? (riskScores[midpoint - 1] + riskScores[midpoint]) / 2
        : riskScores[midpoint];
  const topQuartileIndex = Math.max(0, Math.floor(riskScores.length * 0.75) - 1);
  const topQuartile = riskScores.length === 0 ? 0 : riskScores[topQuartileIndex];
  const templateAverage =
    entries.length === 0
      ? 0
      : Number((entries.reduce((total, entry) => total + entry.metrics.templateReuse, 0) / entries.length).toFixed(2));
  const utilizationAverage =
    entries.length === 0
      ? 0
      : Number((entries.reduce((total, entry) => total + entry.metrics.staffingUtilization, 0) / entries.length).toFixed(2));
  const coverageAverage =
    entries.length === 0
      ? 0
      : Number((entries.reduce((total, entry) => total + entry.metrics.connectorCoverage, 0) / entries.length).toFixed(2));
  const targetEntry = entries.find((entry) => entry.project.id === targetProjectId);
  const percentile = targetEntry
    ? calculatePercentile(targetEntry.metrics.riskScore, riskScores)
    : 0;
  return {
    medianRiskScore: Number(median.toFixed(2)),
    topQuartileRiskScore: Number(topQuartile.toFixed(2)),
    percentile,
    averageTemplateReuse: templateAverage,
    averageUtilization: utilizationAverage,
    averageCoverage: coverageAverage,
  };
};

const computeMetricsForProject = async (project: Project): Promise<BenchmarkMetrics> => {
  const [risks, dataRequests, findings, usages, assignments, syncRuns] = await Promise.all([
    prisma.projectRisk.findMany({ where: { projectId: project.id } }),
    prisma.dataRequest.findMany({ where: { projectId: project.id } }),
    prisma.finding.findMany({ where: { projectId: project.id } }),
    prisma.templateUsage.findMany({ where: { projectId: project.id } }),
    prisma.staffingAssignment.findMany({ where: { projectId: project.id } }),
    prisma.connectorSyncRun.findMany(),
  ]);

  const riskScore = computeRiskScore(risks);
  const unresolvedRisks = risks.filter((risk) => risk.status !== 'RESOLVED').length;
  const dataRequestMetrics = computeDataRequestMetrics(dataRequests);
  const findingMetrics = computeFindingMetrics(findings);
  const templateMetrics = computeTemplateMetrics(usages);
  const staffingMetrics = computeStaffingMetrics(assignments);
  const connectorMetrics = await computeConnectorMetrics(syncRuns);

  return {
    riskScore,
    unresolvedRisks,
    pendingDataRequests: dataRequestMetrics.pendingCount,
    averagePendingDays: dataRequestMetrics.averagePendingDays,
    averageCompletionDays: dataRequestMetrics.averageCompletionDays,
    remediationRate: findingMetrics.remediationRate,
    averageResolutionDays: findingMetrics.averageResolutionDays,
    templateReuse: templateMetrics.reuse,
    templateAverageRating: templateMetrics.rating,
    staffingUtilization: staffingMetrics.utilization,
    billableHours: staffingMetrics.billableHours,
    connectorCoverage: connectorMetrics.coverage,
    connectedConnectors: connectorMetrics.connected,
    totalConnectors: connectorMetrics.total,
    datasetFreshnessDays: connectorMetrics.datasetFreshnessDays,
  };
};

const loadPortfolioEntries = async (): Promise<PortfolioEntry[]> => {
  const projects = await prisma.project.findMany();
  const entries: PortfolioEntry[] = [];
  for (const project of projects) {
    entries.push({ project, metrics: await computeMetricsForProject(project) });
  }
  return entries;
};

const coerceNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const coerceNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return coerceNumber(value);
};

const deserializeMetrics = (raw: Record<string, unknown>): BenchmarkMetrics => ({
  riskScore: coerceNumber(raw.riskScore),
  unresolvedRisks: coerceNumber(raw.unresolvedRisks),
  pendingDataRequests: coerceNumber(raw.pendingDataRequests),
  averagePendingDays: coerceNumber(raw.averagePendingDays),
  averageCompletionDays: coerceNullableNumber(raw.averageCompletionDays),
  remediationRate: coerceNumber(raw.remediationRate),
  averageResolutionDays: coerceNullableNumber(raw.averageResolutionDays),
  templateReuse: coerceNumber(raw.templateReuse),
  templateAverageRating: coerceNullableNumber(raw.templateAverageRating),
  staffingUtilization: coerceNumber(raw.staffingUtilization),
  billableHours: coerceNumber(raw.billableHours),
  connectorCoverage: coerceNumber(raw.connectorCoverage),
  connectedConnectors: coerceNumber(raw.connectedConnectors),
  totalConnectors: coerceNumber(raw.totalConnectors),
  datasetFreshnessDays: coerceNullableNumber(raw.datasetFreshnessDays),
});

const deserializePortfolioSnapshot = (
  raw: Record<string, unknown> | null | undefined
): BenchmarkPortfolioSnapshot | null => {
  if (!raw) {
    return null;
  }
  return {
    medianRiskScore: coerceNumber(raw.medianRiskScore),
    topQuartileRiskScore: coerceNumber(raw.topQuartileRiskScore),
    percentile: coerceNumber(raw.percentile),
    averageTemplateReuse: coerceNumber(raw.averageTemplateReuse),
    averageUtilization: coerceNumber(raw.averageUtilization),
    averageCoverage: coerceNumber(raw.averageCoverage),
  };
};

const computeTrendDirection = (change: number | null): TrendDirection => {
  if (change === null || Number.isNaN(change)) {
    return 'FLAT';
  }
  if (change > 0) {
    return 'UP';
  }
  if (change < 0) {
    return 'DOWN';
  }
  return 'FLAT';
};

const computeTrendImprovement = (orientation: TrendOrientation, change: number | null): boolean | null => {
  if (change === null || change === 0) {
    return null;
  }
  if (orientation === 'HIGHER_IS_BETTER') {
    return change > 0;
  }
  return change < 0;
};

const summarizeTrend = (
  latest: BenchmarkMetrics,
  previous: BenchmarkMetrics | null
): BenchmarkTrendMetricSummary[] =>
  trendMetrics.map((definition) => {
    const currentValue = latest[definition.key];
    const previousValue = previous ? previous[definition.key] : null;
    const change =
      previousValue === null ? null : Number((Number(currentValue) - Number(previousValue)).toFixed(2));
    const direction = computeTrendDirection(change);
    const isImproving = computeTrendImprovement(definition.orientation, change);
    return {
      key: definition.key,
      label: definition.label,
      orientation: definition.orientation,
      latest: Number(Number(currentValue).toFixed(2)),
      previous: previousValue === null ? null : Number(Number(previousValue).toFixed(2)),
      change,
      direction,
      isImproving,
    };
  });

const aggregateMomentum = (summaries: BenchmarkTrendMetricSummary[]) => {
  let improving = 0;
  let declining = 0;
  for (const summary of summaries) {
    if (summary.isImproving === null) {
      continue;
    }
    if (summary.isImproving) {
      improving += 1;
    } else {
      declining += 1;
    }
  }
  return { improving, declining, score: improving - declining };
};

const ensurePortfolioPermissions = (actor: User) => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

export const generateBenchmarkReport = async (projectId: number, actor: User): Promise<BenchmarkReport> => {
  await ensureProjectAccess(projectId, actor);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
  const entries = await loadPortfolioEntries();
  const targetEntry = entries.find((entry) => entry.project.id === projectId);
  if (!targetEntry) {
    throw new Error('Project not found');
  }
  const portfolio = summarizePortfolio(entries, projectId);
  const insights = buildInsights(targetEntry.metrics, portfolio, project);
  const snapshot = await prisma.benchmarkSnapshot.create({
    data: {
      projectId,
      metrics: { ...targetEntry.metrics } as Record<string, unknown>,
      comparisons: { ...portfolio } as Record<string, unknown>,
      insights,
    },
  });
  return {
    project: { id: project.id, name: project.name },
    generatedAt: snapshot.generatedAt.toISOString(),
    metrics: targetEntry.metrics,
    portfolio,
    insights,
    snapshotId: snapshot.id,
  };
};

export const listBenchmarkSnapshots = async (
  projectId: number,
  actor: User,
  options?: { limit?: number }
): Promise<BenchmarkSnapshot[]> => {
  await ensureProjectAccess(projectId, actor);
  const take = options?.limit && options.limit > 0 ? Math.min(options.limit, 50) : 10;
  return prisma.benchmarkSnapshot.findMany({
    where: { projectId },
    orderBy: { generatedAt: 'desc' },
    take,
  });
};

export const recordBenchmarkFeedback = async (
  projectId: number,
  payload: unknown,
  actor: User
): Promise<BenchmarkFeedback> => {
  await ensureProjectAccess(projectId, actor);
  const data = feedbackSchema.parse(payload ?? {});
  const feedback = await prisma.benchmarkFeedback.create({
    data: {
      projectId,
      userId: actor.id,
      usefulness: data.usefulness,
      confidence: data.confidence,
      comment: data.comment ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'BENCHMARK_FEEDBACK_RECORDED',
      metadata: {
        projectId,
        usefulness: data.usefulness,
        confidence: data.confidence,
      },
    },
  });
  return feedback;
};

export const getBenchmarkTrend = async (
  projectId: number,
  actor: User,
  options?: { limit?: number }
): Promise<BenchmarkTrendReport> => {
  await ensureProjectAccess(projectId, actor);
  const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 24) : 12;
  const snapshots = await prisma.benchmarkSnapshot.findMany({
    where: { projectId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });
  if (snapshots.length === 0) {
    throw new Error('No benchmark data available');
  }
  const ordered = [...snapshots].sort((a, b) => a.generatedAt.getTime() - b.generatedAt.getTime());
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
  const series = ordered.map((snapshot) => ({
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt.toISOString(),
    metrics: deserializeMetrics(snapshot.metrics as Record<string, unknown>),
    portfolio: deserializePortfolioSnapshot(snapshot.comparisons as Record<string, unknown>),
  }));
  const latestPoint = series[series.length - 1];
  const previousPoint = series.length > 1 ? series[series.length - 2] : null;
  const metrics = summarizeTrend(latestPoint.metrics, previousPoint ? previousPoint.metrics : null);
  const momentum = aggregateMomentum(metrics);
  return {
    project: { id: project.id, name: project.name },
    series,
    metrics,
    window: {
      start: series[0]?.generatedAt ?? null,
      end: latestPoint.generatedAt,
      totalSnapshots: series.length,
    },
    momentum,
  };
};

const computeLeaderboardEntry = (
  project: Project,
  snapshots: BenchmarkSnapshot[],
  metricDefinition: (typeof leaderboardMetrics)[number]
): BenchmarkLeaderboardEntry | null => {
  if (snapshots.length === 0) {
    return null;
  }
  const sorted = [...snapshots].sort((a, b) => a.generatedAt.getTime() - b.generatedAt.getTime());
  const latest = deserializeMetrics(sorted[sorted.length - 1].metrics as Record<string, unknown>);
  const previous =
    sorted.length > 1
      ? deserializeMetrics(sorted[sorted.length - 2].metrics as Record<string, unknown>)
      : null;
  const value = latest[metricDefinition.key];
  const previousValue = previous ? previous[metricDefinition.key] : null;
  const change =
    previousValue === null ? null : Number((Number(value) - Number(previousValue)).toFixed(2));
  const direction = computeTrendDirection(change);
  const isImproving =
    change === null ? null : metricDefinition.higherIsBetter ? change > 0 : change < 0;
  return {
    rank: 0,
    project: { id: project.id, name: project.name },
    value: Number(Number(value).toFixed(2)),
    previous: previousValue === null ? null : Number(Number(previousValue).toFixed(2)),
    change,
    direction,
    isImproving,
  };
};

export const getBenchmarkLeaderboard = async (
  filters: unknown,
  actor: User
): Promise<BenchmarkLeaderboard> => {
  ensurePortfolioPermissions(actor);
  const params = leaderboardSchema.parse(filters ?? {});
  const metricDefinition = leaderboardMetrics.find((item) => item.key === params.metric)!;
  const projects = await prisma.project.findMany();
  const entries: BenchmarkLeaderboardEntry[] = [];
  for (const project of projects) {
    const history = await prisma.benchmarkSnapshot.findMany({
      where: { projectId: project.id },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });
    if (history.length === 0) {
      continue;
    }
    const entry = computeLeaderboardEntry(project, history, metricDefinition);
    if (entry) {
      entries.push(entry);
    }
  }
  if (entries.length === 0) {
    throw new Error('No benchmark data available');
  }
  entries.sort((a, b) => {
    if (a.value === b.value) {
      return a.project.name.localeCompare(b.project.name);
    }
    if (metricDefinition.higherIsBetter) {
      return b.value - a.value;
    }
    return a.value - b.value;
  });
  const limited = params.limit ? entries.slice(0, params.limit) : entries;
  const ranked = limited.map((entry, index) => ({ ...entry, rank: index + 1 }));
  return {
    generatedAt: new Date().toISOString(),
    metric: { key: metricDefinition.key, label: metricDefinition.label, higherIsBetter: metricDefinition.higherIsBetter },
    entries: ranked,
  };
};

