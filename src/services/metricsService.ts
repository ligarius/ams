import prisma, {
  ApprovalStatus,
  DataRequestStatus,
} from '@/lib/prisma';

const dataRequestStatuses: readonly DataRequestStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'];
const approvalStatuses: readonly ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

type StatusCounts<T extends string> = Record<T, number>;

const initializeCounts = <T extends string>(values: readonly T[]): StatusCounts<T> => {
  return values.reduce((acc, value) => ({ ...acc, [value]: 0 }), {} as StatusCounts<T>);
};

const formatMetric = (name: string, help: string, type: 'gauge' | 'counter', samples: string[]): string => {
  return [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`, ...samples].join('\n');
};

const formatLabeledSamples = <T extends string>(
  metric: string,
  counts: StatusCounts<T>,
  labelName: string
): string[] =>
  Object.entries(counts).map(([status, value]) => `${metric}{${labelName}="${status.toLowerCase()}"} ${value}`);

export const collectPrometheusMetrics = async (): Promise<string> => {
  const [users, projects, auditLogs] = await Promise.all([
    prisma.user.findMany(),
    prisma.project.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const dataRequestBatches = await Promise.all(
    projects.map((project) => prisma.dataRequest.findMany({ where: { projectId: project.id } }))
  );
  const approvalBatches = await Promise.all(
    projects.map((project) => prisma.approval.findMany({ where: { projectId: project.id } }))
  );

  const dataRequests = dataRequestBatches.flat();
  const approvals = approvalBatches.flat();

  const dataRequestCounts = dataRequests.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, initializeCounts(dataRequestStatuses));

  const approvalCounts = approvals.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, initializeCounts(approvalStatuses));

  const metrics = [
    formatMetric('ams_users_total', 'Total number of users registered in the platform', 'gauge', [
      `ams_users_total ${users.length}`,
    ]),
    formatMetric('ams_projects_total', 'Total number of projects created', 'gauge', [
      `ams_projects_total ${projects.length}`,
    ]),
    formatMetric('ams_data_requests_total', 'Total number of data requests tracked', 'gauge', [
      `ams_data_requests_total ${dataRequests.length}`,
    ]),
    formatMetric(
      'ams_data_requests_status_count',
      'Data requests grouped by status',
      'gauge',
      formatLabeledSamples('ams_data_requests_status_count', dataRequestCounts, 'status')
    ),
    formatMetric(
      'ams_approvals_status_count',
      'Approvals grouped by status',
      'gauge',
      formatLabeledSamples('ams_approvals_status_count', approvalCounts, 'status')
    ),
    formatMetric('ams_audit_logs_total', 'Total audit log entries generated', 'counter', [
      `ams_audit_logs_total ${auditLogs.length}`,
    ]),
  ];

  return `${metrics.join('\n')}`.concat('\n');
};

export default collectPrometheusMetrics;
