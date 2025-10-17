import prisma, {
  Approval,
  DataRequest,
  Finding,
  GovernanceEvent,
  GovernanceCadence,
  GovernanceType,
  Initiative,
  Project,
  ProjectKpi,
  User,
} from '@/lib/prisma';

export type PortalStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export interface PortalAlert {
  type: 'DATA_REQUEST' | 'APPROVAL' | 'FINDING';
  title: string;
  dueDate: string | null;
  status: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface PortalProjectSummary {
  project: {
    id: number;
    name: string;
  };
  company: {
    id: number;
    name: string;
  };
  progress: {
    initiatives: {
      total: number;
      completed: number;
      active: number;
      completionRate: number | null;
    };
    kpiAchievement: number | null;
  };
  workload: {
    pendingDataRequests: number;
    overdueDataRequests: number;
    pendingApprovals: number;
    openFindings: number;
  };
  nextGovernanceEvent: {
    id: number;
    name: string;
    type: GovernanceType;
    cadence: GovernanceCadence;
    scheduledAt: string;
  } | null;
  alerts: PortalAlert[];
  status: PortalStatus;
}

export interface PortalTotals {
  projects: number;
  initiatives: {
    total: number;
    completed: number;
    active: number;
    completionRate: number | null;
  };
  kpiAchievement: {
    average: number;
    sampleSize: number;
  };
  dataRequests: {
    pending: number;
    overdue: number;
  };
  approvalsPending: number;
  findingsOpen: number;
}

export interface ClientPortalSnapshot {
  generatedAt: string;
  totals: PortalTotals;
  projects: PortalProjectSummary[];
}

const severityOrder: Record<PortalAlert['severity'], number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

const getProjectsForUser = async (actor: User): Promise<Project[]> => {
  if (actor.role === 'ADMIN') {
    return prisma.project.findMany();
  }
  return prisma.project.findMany({ where: { userId: actor.id } });
};

const computeInitiativeStats = (initiatives: Initiative[]) => {
  const total = initiatives.length;
  const completed = initiatives.filter((initiative) => initiative.status === 'COMPLETED').length;
  const active = total - completed;
  return { total, completed, active };
};

const computeKpiAchievement = (kpis: ProjectKpi[]): number | null => {
  const ratios = kpis
    .filter((kpi) => kpi.target > 0)
    .map((kpi) => {
      const ratio = kpi.current / kpi.target;
      if (Number.isNaN(ratio)) {
        return 0;
      }
      return Math.min(Math.max(ratio, 0), 2);
    });
  if (ratios.length === 0) {
    return null;
  }
  const sum = ratios.reduce((acc, value) => acc + value, 0);
  return sum / ratios.length;
};

const ACTIVE_DATA_REQUEST_STATUSES: DataRequest['status'][] = ['PENDING', 'IN_REVIEW'];

const computeDataRequestStats = (dataRequests: DataRequest[]) => {
  const now = Date.now();
  let pending = 0;
  let overdue = 0;
  for (const request of dataRequests) {
    if (ACTIVE_DATA_REQUEST_STATUSES.includes(request.status)) {
      pending += 1;
      if (request.dueDate && request.dueDate.getTime() < now) {
        overdue += 1;
      }
    }
  }
  return { pending, overdue };
};

const computeNextGovernanceEvent = (
  events: GovernanceEvent[]
): PortalProjectSummary['nextGovernanceEvent'] => {
  const upcoming = events
    .filter((event) => event.nextMeetingAt && event.nextMeetingAt.getTime() > Date.now())
    .sort((a, b) => (a.nextMeetingAt!.getTime() - b.nextMeetingAt!.getTime()));

  if (upcoming.length === 0) {
    return null;
  }

  const nextEvent = upcoming[0];
  return {
    id: nextEvent.id,
    name: nextEvent.name,
    type: nextEvent.type,
    cadence: nextEvent.cadence,
    scheduledAt: nextEvent.nextMeetingAt!.toISOString(),
  };
};

const buildAlerts = (
  dataRequests: DataRequest[],
  approvals: Approval[],
  findings: Finding[]
): PortalAlert[] => {
  const alerts: PortalAlert[] = [];
  const now = Date.now();

  for (const request of dataRequests) {
    if (
      ACTIVE_DATA_REQUEST_STATUSES.includes(request.status) &&
      request.dueDate &&
      request.dueDate.getTime() < now
    ) {
      alerts.push({
        type: 'DATA_REQUEST',
        title: request.title,
        dueDate: request.dueDate.toISOString(),
        status: request.status,
        severity: 'CRITICAL',
      });
    }
  }

  for (const approval of approvals) {
    if (approval.status === 'PENDING') {
      alerts.push({
        type: 'APPROVAL',
        title: approval.title,
        dueDate: null,
        status: approval.status,
        severity: 'WARNING',
      });
    }
  }

  for (const finding of findings) {
    if (finding.status !== 'RESOLVED') {
      alerts.push({
        type: 'FINDING',
        title: finding.title,
        dueDate: null,
        status: finding.status,
        severity: 'WARNING',
      });
    }
  }

  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate) {
      return -1;
    }
    if (b.dueDate) {
      return 1;
    }
    return a.title.localeCompare(b.title);
  });

  return alerts;
};

const evaluateStatus = (args: {
  kpiAchievement: number | null;
  overdueDataRequests: number;
  pendingApprovals: number;
  openFindings: number;
}): PortalStatus => {
  const { kpiAchievement, overdueDataRequests, pendingApprovals, openFindings } = args;
  const achievement = kpiAchievement ?? 1;

  if (overdueDataRequests > 1 || achievement < 0.4) {
    return 'OFF_TRACK';
  }
  if (overdueDataRequests > 0 || pendingApprovals > 0 || openFindings > 0 || achievement < 0.75) {
    return 'AT_RISK';
  }
  return 'ON_TRACK';
};

const aggregateTotals = (projects: PortalProjectSummary[]): PortalTotals => {
  let initiativeTotal = 0;
  let initiativeCompleted = 0;
  let initiativeActive = 0;
  let pendingDataRequests = 0;
  let overdueDataRequests = 0;
  let approvalsPending = 0;
  let findingsOpen = 0;
  const kpiValues: number[] = [];

  for (const project of projects) {
    initiativeTotal += project.progress.initiatives.total;
    initiativeCompleted += project.progress.initiatives.completed;
    initiativeActive += project.progress.initiatives.active;
    pendingDataRequests += project.workload.pendingDataRequests;
    overdueDataRequests += project.workload.overdueDataRequests;
    approvalsPending += project.workload.pendingApprovals;
    findingsOpen += project.workload.openFindings;
    if (project.progress.kpiAchievement !== null) {
      kpiValues.push(project.progress.kpiAchievement);
    }
  }

  const completionRate =
    initiativeTotal > 0 ? initiativeCompleted / initiativeTotal : null;
  const averageKpi =
    kpiValues.length > 0 ? kpiValues.reduce((acc, value) => acc + value, 0) / kpiValues.length : 0;

  return {
    projects: projects.length,
    initiatives: {
      total: initiativeTotal,
      completed: initiativeCompleted,
      active: initiativeActive,
      completionRate,
    },
    kpiAchievement: {
      average: averageKpi,
      sampleSize: kpiValues.length,
    },
    dataRequests: {
      pending: pendingDataRequests,
      overdue: overdueDataRequests,
    },
    approvalsPending,
    findingsOpen,
  };
};

export const getClientPortalSnapshot = async (actor: User): Promise<ClientPortalSnapshot> => {
  const projects = await getProjectsForUser(actor);
  const generatedAt = new Date();

  if (projects.length === 0) {
    return {
      generatedAt: generatedAt.toISOString(),
      totals: {
        projects: 0,
        initiatives: {
          total: 0,
          completed: 0,
          active: 0,
          completionRate: null,
        },
        kpiAchievement: {
          average: 0,
          sampleSize: 0,
        },
        dataRequests: {
          pending: 0,
          overdue: 0,
        },
        approvalsPending: 0,
        findingsOpen: 0,
      },
      projects: [],
    };
  }

  const companies = await prisma.company.findMany();
  const companyMap = new Map(companies.map((company) => [company.id, company]));

  const projectSummaries = await Promise.all(
    projects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (project) => {
        const [kpis, initiatives, dataRequests, approvals, findings, governance] = await Promise.all([
          prisma.projectKpi.findMany({ where: { projectId: project.id } }),
          prisma.initiative.findMany({ where: { projectId: project.id } }),
          prisma.dataRequest.findMany({ where: { projectId: project.id } }),
          prisma.approval.findMany({ where: { projectId: project.id } }),
          prisma.finding.findMany({ where: { projectId: project.id } }),
          prisma.governanceEvent.findMany({ where: { projectId: project.id } }),
        ]);

        const initiativeStats = computeInitiativeStats(initiatives);
        const kpiAchievement = computeKpiAchievement(kpis);
        const dataRequestStats = computeDataRequestStats(dataRequests);
        const pendingApprovals = approvals.filter((approval) => approval.status === 'PENDING');
        const openFindings = findings.filter((finding) => finding.status !== 'RESOLVED');
        const nextGovernanceEvent = computeNextGovernanceEvent(governance);
        const alerts = buildAlerts(dataRequests, approvals, findings);
        const status = evaluateStatus({
          kpiAchievement,
          overdueDataRequests: dataRequestStats.overdue,
          pendingApprovals: pendingApprovals.length,
          openFindings: openFindings.length,
        });

        const company = companyMap.get(project.companyId);

        return {
          project: {
            id: project.id,
            name: project.name,
          },
          company: {
            id: project.companyId,
            name: company ? company.name : 'Unknown company',
          },
          progress: {
            initiatives: {
              total: initiativeStats.total,
              completed: initiativeStats.completed,
              active: initiativeStats.active,
              completionRate:
                initiativeStats.total > 0 ? initiativeStats.completed / initiativeStats.total : null,
            },
            kpiAchievement,
          },
          workload: {
            pendingDataRequests: dataRequestStats.pending,
            overdueDataRequests: dataRequestStats.overdue,
            pendingApprovals: pendingApprovals.length,
            openFindings: openFindings.length,
          },
          nextGovernanceEvent,
          alerts,
          status,
        } satisfies PortalProjectSummary;
      })
  );

  return {
    generatedAt: generatedAt.toISOString(),
    totals: aggregateTotals(projectSummaries),
    projects: projectSummaries,
  };
};

export default getClientPortalSnapshot;
