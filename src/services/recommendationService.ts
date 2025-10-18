import prisma, {
  Approval,
  DataRequest,
  Finding,
  IntegrationConnector,
  Project,
  ProjectChecklist,
  ProjectRisk,
  TemplateUsage,
  User,
} from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';
import { searchTemplates } from '@/services/templateService';

interface PortfolioMetrics {
  highRiskCount: number;
  unresolvedFindings: number;
  pendingDataRequests: number;
  overdueDataRequests: number;
  pendingChecklists: number;
  pendingApprovals: number;
  templateReuse: number;
}

export interface RecommendationDriver {
  label: string;
  impact: number;
}

export interface RecommendationInsight {
  id: string;
  title: string;
  description: string;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  drivers: RecommendationDriver[];
  suggestedTemplates: Array<{
    id: number;
    name: string;
    score: number;
    averageRating: number | null;
    currentVersionNumber: number | null;
  }>;
  supportingData: Record<string, unknown>;
}

export interface RecommendationSummary {
  project: { id: number; name: string };
  generatedAt: string;
  metrics: PortfolioMetrics;
  connectors: Array<Pick<IntegrationConnector, 'id' | 'name' | 'key' | 'type' | 'status' | 'capabilities'>>;
  recommendations: RecommendationInsight[];
}

const logistic = (value: number): number => 1 / (1 + Math.exp(-value));

const determineConfidence = (score: number): RecommendationInsight['confidence'] => {
  if (score >= 70) {
    return 'HIGH';
  }
  if (score >= 45) {
    return 'MEDIUM';
  }
  return 'LOW';
};

const summarizeMetrics = (
  risks: ProjectRisk[],
  findings: Finding[],
  dataRequests: DataRequest[],
  checklists: ProjectChecklist[],
  approvals: Approval[],
  usages: TemplateUsage[]
): PortfolioMetrics => {
  const highRiskCount = risks.filter((risk) => risk.severity === 'HIGH' || risk.urgency === 'HIGH').length;
  const unresolvedFindings = findings.filter((finding) => finding.status !== 'RESOLVED').length;
  const pendingDataRequests = dataRequests.filter((request) => request.status !== 'APPROVED').length;
  const overdueDataRequests = dataRequests.filter((request) => {
    if (!request.dueDate) {
      return false;
    }
    return request.status !== 'APPROVED' && request.dueDate.getTime() < Date.now();
  }).length;
  const pendingChecklists = checklists.filter((checklist) => checklist.status !== 'COMPLETED').length;
  const pendingApprovals = approvals.filter((approval) => approval.status === 'PENDING').length;
  return {
    highRiskCount,
    unresolvedFindings,
    pendingDataRequests,
    overdueDataRequests,
    pendingChecklists,
    pendingApprovals,
    templateReuse: usages.length,
  };
};

const buildBaseScore = (metrics: PortfolioMetrics): number => {
  const weighted =
    -1.1 +
    metrics.highRiskCount * 0.9 +
    metrics.unresolvedFindings * 0.6 +
    metrics.pendingDataRequests * 0.45 +
    metrics.overdueDataRequests * 0.75 +
    metrics.pendingChecklists * 0.35 +
    metrics.pendingApprovals * 0.4 +
    metrics.templateReuse * 0.15;
  return Math.round(logistic(weighted) * 100);
};

const toConnectorSnapshot = (connector: IntegrationConnector) => ({
  id: connector.id,
  name: connector.name,
  key: connector.key,
  type: connector.type,
  status: connector.status,
  capabilities: [...connector.capabilities],
});

const fetchTemplatesForTags = async (tags: string[], actor: User) => {
  if (tags.length === 0) {
    return [];
  }
  try {
    const hits = await searchTemplates({ tags, limit: 3 }, actor);
    return hits.map((hit) => ({
      id: hit.id,
      name: hit.name,
      score: hit.score,
      averageRating: hit.averageRating,
      currentVersionNumber: hit.currentVersionNumber ?? null,
    }));
  } catch (error) {
    return [];
  }
};

const composeRecommendation = async (
  baseScore: number,
  actor: User,
  templateTags: string[],
  insight: Omit<RecommendationInsight, 'suggestedTemplates' | 'score' | 'confidence'> & { baselineBoost?: number }
): Promise<RecommendationInsight> => {
  const templates = await fetchTemplatesForTags(templateTags, actor);
  const driversImpact = insight.drivers.reduce((total, driver) => total + driver.impact, 0);
  const finalScore = Math.min(100, Math.round(baseScore * 0.45 + driversImpact * 10 + (insight.baselineBoost ?? 20)));
  return {
    ...insight,
    score: finalScore,
    confidence: determineConfidence(finalScore),
    suggestedTemplates: templates,
  };
};

const buildRecommendations = async (
  project: Project,
  metrics: PortfolioMetrics,
  connectors: IntegrationConnector[],
  actor: User
): Promise<RecommendationInsight[]> => {
  const baseScore = buildBaseScore(metrics);
  const recommendations: RecommendationInsight[] = [];

  if (metrics.highRiskCount > 0 || metrics.unresolvedFindings > 0) {
    recommendations.push(
      await composeRecommendation(baseScore, actor, ['riesgos', 'controles'], {
        id: 'risk-mitigation-playbook',
        title: 'Activar plan acelerado de mitigación de riesgos críticos',
        description:
          'Consolida riesgos de alta criticidad, asigna responsables y utiliza plantillas de control interno para acelerar la remediación.',
        drivers: [
          { label: 'Riesgos con severidad alta', impact: metrics.highRiskCount },
          { label: 'Hallazgos abiertos', impact: metrics.unresolvedFindings * 0.8 },
        ],
        supportingData: {
          projectId: project.id,
          highRiskCount: metrics.highRiskCount,
          unresolvedFindings: metrics.unresolvedFindings,
        },
        baselineBoost: 25,
      })
    );
  }

  if (metrics.pendingDataRequests > 0) {
    recommendations.push(
      await composeRecommendation(baseScore, actor, ['data requests', 'colaboración'], {
        id: 'data-requests-fast-track',
        title: 'Implementar célula de respuesta ágil a solicitudes de información',
        description:
          'Prioriza solicitudes pendientes, automatiza recordatorios y habilita tableros de seguimiento compartidos con el cliente.',
        drivers: [
          { label: 'Solicitudes pendientes', impact: metrics.pendingDataRequests * 0.7 },
          { label: 'Solicitudes vencidas', impact: metrics.overdueDataRequests },
        ],
        supportingData: {
          projectId: project.id,
          pendingRequests: metrics.pendingDataRequests,
          overdueRequests: metrics.overdueDataRequests,
        },
        baselineBoost: 18,
      })
    );
  }

  if (metrics.pendingChecklists > 0 || metrics.pendingApprovals > 0) {
    recommendations.push(
      await composeRecommendation(baseScore, actor, ['gobernanza', 'aprobaciones'], {
        id: 'governance-ops-review',
        title: 'Facilitar comité de gobernanza con enfoque en bloqueos operativos',
        description:
          'Coordina una sesión ejecutiva con foco en checklists pendientes y aprobaciones críticas para destrabar entregables.',
        drivers: [
          { label: 'Checklists abiertos', impact: metrics.pendingChecklists * 0.5 },
          { label: 'Aprobaciones pendientes', impact: metrics.pendingApprovals * 0.6 },
        ],
        supportingData: {
          projectId: project.id,
          pendingChecklists: metrics.pendingChecklists,
          pendingApprovals: metrics.pendingApprovals,
        },
        baselineBoost: 15,
      })
    );
  }

  const connectedErp = connectors.find((connector) => connector.type === 'ERP');
  const connectedCrm = connectors.find((connector) => connector.type === 'CRM');

  if (connectedErp || connectedCrm) {
    const integrationDrivers: RecommendationDriver[] = [];
    if (connectedErp) {
      integrationDrivers.push({ label: `${connectedErp.name} listo para sincronización`, impact: 1.2 });
    }
    if (connectedCrm) {
      integrationDrivers.push({ label: `${connectedCrm.name} conectado`, impact: 1 });
    }
    recommendations.push(
      await composeRecommendation(baseScore, actor, ['integración', 'analytics'], {
        id: 'advanced-analytics-sprint',
        title: 'Lanzar sprint de inteligencia con datos ERP/CRM integrados',
        description:
          'Aprovecha los conectores disponibles para crear datasets curados (Power BI/Tableau) con foco en rentabilidad y ciclo comercial.',
        drivers: integrationDrivers,
        supportingData: {
          projectId: project.id,
          connectors: connectors.map((connector) => ({ key: connector.key, status: connector.status })),
        },
        baselineBoost: 22,
      })
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      await composeRecommendation(baseScore, actor, ['mejora continua'], {
        id: 'continuous-improvement-review',
        title: 'Conducir retrospectiva de aprendizaje y reutilización',
        description:
          'Revisa métricas clave, captura buenas prácticas y selecciona plantillas de reutilización para los siguientes hitos.',
        drivers: [{ label: 'Actividad reciente del proyecto', impact: Math.max(1, metrics.templateReuse * 0.5) }],
        supportingData: {
          projectId: project.id,
          templateReuse: metrics.templateReuse,
        },
        baselineBoost: 20,
      })
    );
  }

  return recommendations.sort((a, b) => b.score - a.score);
};

export const generateProjectRecommendations = async (
  projectId: number,
  actor: User
): Promise<RecommendationSummary> => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  await ensureProjectAccess(projectId, actor);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  const [risks, findings, dataRequests, checklists, approvals, usages, connectors] = await Promise.all([
    prisma.projectRisk.findMany({ where: { projectId } }),
    prisma.finding.findMany({ where: { projectId } }),
    prisma.dataRequest.findMany({ where: { projectId } }),
    prisma.projectChecklist.findMany({ where: { projectId } }),
    prisma.approval.findMany({ where: { projectId } }),
    prisma.templateUsage.findMany({ where: { projectId } }),
    prisma.integrationConnector.findMany(),
  ]);

  const metrics = summarizeMetrics(risks, findings, dataRequests, checklists, approvals, usages);
  const recommendations = await buildRecommendations(project, metrics, connectors, actor);

  return {
    project: { id: project.id, name: project.name },
    generatedAt: new Date().toISOString(),
    metrics,
    connectors: connectors.map(toConnectorSnapshot),
    recommendations,
  };
};
