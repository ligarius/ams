import bcrypt from 'bcrypt';
import logger from '@/lib/logger';
import env from '@/config/env';

export type UserRole = 'ADMIN' | 'CONSULTANT' | 'CLIENT';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: number;
  companyId: number;
  name: string;
  description?: string | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: number;
  projectId: number;
  userId: number;
  role: UserRole;
  createdAt: Date;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface RefreshToken {
  id: number;
  userId: number;
  tokenHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ChecklistStatus = 'PENDING' | 'COMPLETED';
export type GovernanceCadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'AD_HOC';
export type GovernanceType = 'STEERING_COMMITTEE' | 'WORKING_GROUP' | 'SPONSOR_CHECKIN';
export type DataRequestStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
export type FindingStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SignatureStatus = 'PENDING' | 'SENT' | 'SIGNED' | 'REJECTED';
export type TenantStatus = 'ACTIVE' | 'INACTIVE';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type CurrencyCode = 'USD' | 'EUR' | 'CLP' | 'MXN' | 'COP';
export type InitiativeType = 'QUICK_WIN' | 'POC' | 'PROJECT';
export type InitiativeStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantArea {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  parentAreaId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: number;
  tenantId: number;
  code: string;
  title: string;
  status: ContractStatus;
  startDate: Date;
  endDate: Date | null;
  value: number | null;
  currency: CurrencyCode | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCategory {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface ProjectRisk {
  id: number;
  projectId: number;
  categoryId: number | null;
  title: string;
  description: string | null;
  severity: RiskLevel;
  likelihood: RiskLevel;
  urgency: RiskLevel;
  complexity: RiskLevel;
  status: RiskStatus;
  process: string | null;
  system: string | null;
  dataRequestId: number | null;
  createdAt: Date;
}

export interface ProjectChecklist {
  id: number;
  projectId: number;
  name: string;
  dueDate: Date | null;
  status: ChecklistStatus;
  createdAt: Date;
}

export interface ProjectKpi {
  id: number;
  projectId: number;
  name: string;
  target: number;
  current: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  createdAt: Date;
}

export interface GovernanceEvent {
  id: number;
  projectId: number;
  type: GovernanceType;
  name: string;
  cadence: GovernanceCadence;
  owner: string;
  nextMeetingAt: Date | null;
  createdAt: Date;
}

export interface DataRequest {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: DataRequestStatus;
  createdById: number;
  assignedToId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRequestAttachment {
  id: number;
  dataRequestId: number;
  fileName: string;
  content: string;
  uploadedById: number;
  uploadedAt: Date;
}

export interface Finding {
  id: number;
  projectId: number;
  riskId: number;
  dataRequestId: number | null;
  title: string;
  description: string | null;
  status: FindingStatus;
  createdById: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface Approval {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  createdById: number;
  decidedById: number | null;
  decidedAt: Date | null;
  signatureEnvelopeId: string | null;
  signatureDocumentId: string | null;
  signatureUrl: string | null;
  signatureStatus: SignatureStatus;
  signatureSentAt: Date | null;
  signatureCompletedAt: Date | null;
  signatureDeclinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Initiative {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  type: InitiativeType;
  status: InitiativeStatus;
  resourceSummary: string;
  startDate: Date;
  endDate: Date;
  estimatedBudget: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiativeAssignment {
  id: number;
  initiativeId: number;
  userId: number;
  role: string;
  allocationPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsultantSeniority = 'ASSOCIATE' | 'CONSULTANT' | 'SENIOR' | 'MANAGER' | 'DIRECTOR';
export type BillingModel = 'MILESTONE' | 'MONTHLY';
export type BillingStatus = 'PLANNED' | 'INVOICED' | 'PAID';

export interface Consultant {
  id: number;
  name: string;
  email: string;
  title: string;
  seniority: ConsultantSeniority;
  practiceArea: string;
  skills: string[];
  costRate: number;
  billableRate: number;
  weeklyCapacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffingAssignment {
  id: number;
  consultantId: number;
  projectId: number;
  startDate: Date;
  endDate: Date | null;
  allocation: number;
  hoursPerWeek: number;
  billable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFinancialSettings {
  id: number;
  projectId: number;
  billingModel: BillingModel;
  currency: CurrencyCode;
  paymentTerms: string | null;
  lastUpdatedById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingScheduleItem {
  id: number;
  projectId: number;
  type: BillingModel;
  name: string;
  dueDate: Date;
  amount: number;
  currency: CurrencyCode;
  status: BillingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentCategory = 'EVIDENCE' | 'DELIVERABLE' | 'POLICY' | 'PROCEDURE';
export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';

export interface ProjectDocument {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  tags: string[];
  createdById: number;
  updatedById: number;
  currentVersionId: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDocumentVersion {
  id: number;
  documentId: number;
  version: number;
  fileName: string;
  content: string;
  checksum: string;
  note: string | null;
  createdById: number;
  createdAt: Date;
}

export type TemplateKind = 'CHECKLIST' | 'PLAYBOOK' | 'DELIVERABLE' | 'RISK_LIBRARY';
export type TemplateMaturity = 'FOUNDATIONAL' | 'ADVANCED' | 'EXPERT';

export interface Template {
  id: number;
  name: string;
  slug: string;
  kind: TemplateKind;
  category: string;
  description: string | null;
  tags: string[];
  industries: string[];
  maturity: TemplateMaturity;
  searchVector: string;
  createdById: number;
  updatedById: number;
  createdAt: Date;
  updatedAt: Date;
  currentVersionId: number | null;
  currentVersionNumber: number | null;
  usageCount: number;
  ratingSum: number;
  ratingCount: number;
}

export interface TemplateVersion {
  id: number;
  templateId: number;
  versionNumber: number;
  isMajor: boolean;
  changeLog: string;
  summary: string;
  content: string;
  estimatedEffortHours: number;
  recommendedRoles: string[];
  deliverables: string[];
  maturityFocus: TemplateMaturity;
  createdById: number;
  createdAt: Date;
}

export interface TemplateUsage {
  id: number;
  templateId: number;
  projectId: number;
  usedById: number;
  rating: number | null;
  notes: string | null;
  observedBenefits: string[];
  createdAt: Date;
}

export type ConnectorType = 'ERP' | 'CRM' | 'BI';
export type ConnectorProtocol = 'REST' | 'GRAPHQL';
export type ConnectorStatus = 'READY' | 'CONNECTED' | 'ERROR';
export type ConnectorAuthType = 'OAUTH2' | 'API_KEY';

export interface IntegrationConnector {
  id: number;
  key: string;
  name: string;
  vendor: string;
  type: ConnectorType;
  protocol: ConnectorProtocol;
  authType: ConnectorAuthType;
  capabilities: string[];
  supportedEntities: string[];
  configuration: Record<string, unknown>;
  status: ConnectorStatus;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SyncStatus = 'SUCCESS' | 'FAILED';

export interface ConnectorSyncRun {
  id: number;
  connectorId: number;
  startedAt: Date;
  finishedAt: Date;
  status: SyncStatus;
  recordsPulled: number;
  errorMessage: string | null;
  datasetId: number | null;
}

export type BiDatasetFormat = 'POWER_BI' | 'TABLEAU';

export interface BiDataset {
  id: number;
  connectorId: number;
  name: string;
  format: BiDatasetFormat;
  schemaVersion: string;
  content: Record<string, unknown>;
  createdAt: Date;
}

export interface BenchmarkInsightRecord {
  id: string;
  title: string;
  description: string;
  impact: number;
  tags: string[];
}

export interface BenchmarkSnapshot {
  id: number;
  projectId: number;
  generatedAt: Date;
  metrics: Record<string, unknown>;
  comparisons: Record<string, unknown>;
  insights: BenchmarkInsightRecord[];
}

export interface BenchmarkFeedback {
  id: number;
  projectId: number;
  userId: number;
  usefulness: number;
  confidence: number;
  comment: string | null;
  submittedAt: Date;
}

interface DatabaseState {
  tenants: Tenant[];
  tenantAreas: TenantArea[];
  contracts: Contract[];
  users: User[];
  companies: Company[];
  projects: Project[];
  memberships: Membership[];
  auditLogs: AuditLog[];
  refreshTokens: RefreshToken[];
  projectCategories: ProjectCategory[];
  projectRisks: ProjectRisk[];
  projectChecklists: ProjectChecklist[];
  projectKpis: ProjectKpi[];
  governanceEvents: GovernanceEvent[];
  dataRequests: DataRequest[];
  dataRequestAttachments: DataRequestAttachment[];
  findings: Finding[];
  approvals: Approval[];
  initiatives: Initiative[];
  initiativeAssignments: InitiativeAssignment[];
  consultants: Consultant[];
  staffingAssignments: StaffingAssignment[];
  projectFinancialSettings: ProjectFinancialSettings[];
  billingScheduleItems: BillingScheduleItem[];
  projectDocuments: ProjectDocument[];
  projectDocumentVersions: ProjectDocumentVersion[];
  templates: Template[];
  templateVersions: TemplateVersion[];
  templateUsages: TemplateUsage[];
  integrationConnectors: IntegrationConnector[];
  connectorSyncRuns: ConnectorSyncRun[];
  biDatasets: BiDataset[];
  benchmarkSnapshots: BenchmarkSnapshot[];
  benchmarkFeedback: BenchmarkFeedback[];
  sequences: Record<string, number>;
}

const createEmptyState = (): DatabaseState => ({
  tenants: [],
  tenantAreas: [],
  contracts: [],
  users: [],
  companies: [],
  projects: [],
  memberships: [],
  auditLogs: [],
  refreshTokens: [],
  projectCategories: [],
  projectRisks: [],
  projectChecklists: [],
  projectKpis: [],
  governanceEvents: [],
  dataRequests: [],
  dataRequestAttachments: [],
  findings: [],
  approvals: [],
  initiatives: [],
  initiativeAssignments: [],
  consultants: [],
  staffingAssignments: [],
  projectFinancialSettings: [],
  billingScheduleItems: [],
  projectDocuments: [],
  projectDocumentVersions: [],
  templates: [],
  templateVersions: [],
  templateUsages: [],
  integrationConnectors: [],
  connectorSyncRuns: [],
  biDatasets: [],
  benchmarkSnapshots: [],
  benchmarkFeedback: [],
  sequences: {},
});

type GlobalPrismaState = typeof globalThis & {
  __PRISMA_STATE__?: DatabaseState;
};

const getGlobalState = (): DatabaseState => {
  const globalForPrisma = globalThis as GlobalPrismaState;
  if (!globalForPrisma.__PRISMA_STATE__) {
    globalForPrisma.__PRISMA_STATE__ = createEmptyState();
  }
  return globalForPrisma.__PRISMA_STATE__;
};

let state: DatabaseState = getGlobalState();

const nextId = (model: keyof DatabaseState['sequences']) => {
  const current = state.sequences[model] ?? 0;
  const next = current + 1;
  state.sequences[model] = next;
  return next;
};

const now = () => new Date();

const seed = () => {
  const tenantId = nextId('tenants');
  const timestamp = now();
  const slug = 'acme-consulting';
  const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  state.tenants.push({
    id: tenantId,
    name: 'Acme Consulting',
    slug,
    industry: 'Consultoría',
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const corporateAreaId = nextId('tenantAreas');
  state.tenantAreas.push({
    id: corporateAreaId,
    tenantId,
    name: 'Oficina Central',
    description: 'Equipo de dirección y soporte corporativo',
    parentAreaId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  state.contracts.push({
    id: nextId('contracts'),
    tenantId,
    code: 'CNT-0001',
    title: 'Contrato Marco Servicios Auditoría',
    status: 'ACTIVE',
    startDate: timestamp,
    endDate: null,
    value: 250000,
    currency: 'USD',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const adminId = nextId('users');
  const passwordHash = bcrypt.hashSync('Admin123!', 10);
  state.users.push({
    id: adminId,
    email: 'admin@example.com',
    passwordHash,
    role: 'ADMIN',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const consultantId = nextId('users');
  state.users.push({
    id: consultantId,
    email: 'consultant@example.com',
    passwordHash: bcrypt.hashSync('Consult123!', 10),
    role: 'CONSULTANT',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const clientId = nextId('users');
  state.users.push({
    id: clientId,
    email: 'client@example.com',
    passwordHash: bcrypt.hashSync('Client123!', 10),
    role: 'CLIENT',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const companyId = nextId('companies');
  state.companies.push({
    id: companyId,
    name: 'Acme Corp',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const projectId = nextId('projects');
  state.projects.push({
    id: projectId,
    companyId,
    name: 'Programa de Control Financiero 2024',
    description:
      'Fortalecimiento de controles SOX, automatización de conciliaciones y mejoras al programa de monitoreo continuo.',
    createdById: adminId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const projectMemberships: Array<{ userId: number; role: UserRole }> = [
    { userId: adminId, role: 'ADMIN' },
    { userId: consultantId, role: 'CONSULTANT' },
    { userId: clientId, role: 'CLIENT' },
  ];
  for (const membership of projectMemberships) {
    state.memberships.push({
      id: nextId('memberships'),
      projectId,
      userId: membership.userId,
      role: membership.role,
      createdAt: timestamp,
    });
  }

  state.auditLogs.push({
    id: nextId('auditLogs'),
    userId: adminId,
    action: 'SEED',
    metadata: { version: 'sprint-1', env: env.NODE_ENV, tenantSlug: slug },
    createdAt: timestamp,
  });

  state.auditLogs.push({
    id: nextId('auditLogs'),
    userId: adminId,
    action: 'PROJECT_CREATED',
    metadata: { projectId, companyId, name: 'Programa de Control Financiero 2024' },
    createdAt: timestamp,
  });

  const categories = [
    {
      id: nextId('projectCategories'),
      projectId,
      name: 'Gobernanza y Supervisión',
      description: 'Estructura de gobierno y comités de seguimiento del programa.',
      createdAt: timestamp,
    },
    {
      id: nextId('projectCategories'),
      projectId,
      name: 'Procesos Críticos',
      description: 'Procesos financieros con mayor exposición a riesgos SOX.',
      createdAt: timestamp,
    },
    {
      id: nextId('projectCategories'),
      projectId,
      name: 'Tecnología y Automatización',
      description: 'Oportunidades de automatización y digitalización de controles.',
      createdAt: timestamp,
    },
  ];
  state.projectCategories.push(...categories);

  const risks = [
    {
      id: nextId('projectRisks'),
      projectId,
      categoryId: categories[1].id,
      title: 'Segregación de funciones insuficiente en pagos',
      description:
        'Se identificaron usuarios con permisos incompatibles en el proceso de cuentas por pagar que elevan el riesgo de fraude.',
      severity: 'HIGH' as const,
      likelihood: 'MEDIUM' as const,
      urgency: 'HIGH' as const,
      complexity: 'MEDIUM' as const,
      status: 'IN_PROGRESS' as const,
      process: 'Cuentas por pagar',
      system: 'SAP S/4HANA',
      dataRequestId: null,
      createdAt: timestamp,
    },
    {
      id: nextId('projectRisks'),
      projectId,
      categoryId: categories[2].id,
      title: 'Controles manuales sin evidencia digital',
      description: 'Las aprobaciones de ajustes contables se realizan por correo sin trazabilidad centralizada.',
      severity: 'MEDIUM' as const,
      likelihood: 'HIGH' as const,
      urgency: 'MEDIUM' as const,
      complexity: 'LOW' as const,
      status: 'OPEN' as const,
      process: 'Cierre contable',
      system: 'Plantillas ofimáticas',
      dataRequestId: null,
      createdAt: timestamp,
    },
  ];
  state.projectRisks.push(...risks);

  const checklists = [
    {
      id: nextId('projectChecklists'),
      projectId,
      name: 'Mapeo de procesos críticos',
      dueDate: addDays(timestamp, 7),
      status: 'PENDING' as const,
      createdAt: timestamp,
    },
    {
      id: nextId('projectChecklists'),
      projectId,
      name: 'Validación de controles SOX clave',
      dueDate: addDays(timestamp, 14),
      status: 'PENDING' as const,
      createdAt: timestamp,
    },
    {
      id: nextId('projectChecklists'),
      projectId,
      name: 'Entrega de informe ejecutivo inicial',
      dueDate: addDays(timestamp, 21),
      status: 'COMPLETED' as const,
      createdAt: timestamp,
    },
  ];
  state.projectChecklists.push(...checklists);

  const kpis = [
    {
      id: nextId('projectKpis'),
      projectId,
      name: 'Controles certificados',
      target: 18,
      current: 9,
      unit: 'controles',
      trend: 'UP' as const,
      createdAt: timestamp,
    },
    {
      id: nextId('projectKpis'),
      projectId,
      name: 'Hallazgos mitigados',
      target: 12,
      current: 4,
      unit: 'hallazgos',
      trend: 'STABLE' as const,
      createdAt: timestamp,
    },
    {
      id: nextId('projectKpis'),
      projectId,
      name: 'Porcentaje de evidencias cargadas',
      target: 100,
      current: 65,
      unit: '%',
      trend: 'UP' as const,
      createdAt: timestamp,
    },
  ];
  state.projectKpis.push(...kpis);

  const governanceEvents = [
    {
      id: nextId('governanceEvents'),
      projectId,
      type: 'STEERING_COMMITTEE' as const,
      name: 'Comité Directivo Mensual',
      cadence: 'MONTHLY' as const,
      owner: 'María López (CFO)',
      nextMeetingAt: addDays(timestamp, 10),
      createdAt: timestamp,
    },
    {
      id: nextId('governanceEvents'),
      projectId,
      type: 'WORKING_GROUP' as const,
      name: 'Célula de trabajo semanal',
      cadence: 'WEEKLY' as const,
      owner: 'Carlos Pérez (PMO)',
      nextMeetingAt: addDays(timestamp, 7),
      createdAt: timestamp,
    },
    {
      id: nextId('governanceEvents'),
      projectId,
      type: 'SPONSOR_CHECKIN' as const,
      name: 'Check-in quincenal con sponsor',
      cadence: 'BIWEEKLY' as const,
      owner: 'Ana Rivas (Sponsor Ejecutivo)',
      nextMeetingAt: addDays(timestamp, 15),
      createdAt: timestamp,
    },
  ];
  state.governanceEvents.push(...governanceEvents);

  const dataRequests = [
    {
      id: nextId('dataRequests'),
      projectId,
      title: 'Extracto de gastos operativos Q1',
      description: 'Detalle mensual de gastos operativos con clasificación de centros de costo.',
      dueDate: addDays(timestamp, 5),
      status: 'IN_REVIEW' as const,
      createdById: consultantId,
      assignedToId: clientId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextId('dataRequests'),
      projectId,
      title: 'Políticas y procedimientos de tesorería',
      description: 'Versión vigente de políticas, responsables y evidencia de difusión.',
      dueDate: addDays(timestamp, -2),
      status: 'APPROVED' as const,
      createdById: adminId,
      assignedToId: clientId,
      createdAt: timestamp,
      updatedAt: addDays(timestamp, -1),
    },
  ];
  state.dataRequests.push(...dataRequests);

  state.dataRequestAttachments.push({
    id: nextId('dataRequestAttachments'),
    dataRequestId: dataRequests[0].id,
    fileName: 'gastos-operativos-q1.xlsx',
    content: 'UEsDBAoAAAAAA...',
    uploadedById: clientId,
    uploadedAt: addDays(timestamp, 1),
  });

  const findings = [
    {
      id: nextId('findings'),
      projectId,
      riskId: risks[0].id,
      dataRequestId: dataRequests[0].id,
      title: 'Usuarios con permisos conflictivos',
      description: 'Se detectaron 12 combinaciones de permisos que permiten crear y aprobar pagos sin revisión independiente.',
      status: 'IN_REVIEW' as const,
      createdById: consultantId,
      updatedAt: addDays(timestamp, 2),
      createdAt: timestamp,
    },
    {
      id: nextId('findings'),
      projectId,
      riskId: risks[1].id,
      dataRequestId: null,
      title: 'Evidencia dispersa en correos',
      description: 'El 70% de aprobaciones se encuentra en correos individuales sin repositorio común.',
      status: 'OPEN' as const,
      createdById: consultantId,
      updatedAt: timestamp,
      createdAt: timestamp,
    },
  ];
  state.findings.push(...findings);

  state.approvals.push({
    id: nextId('approvals'),
    projectId,
    title: 'Aprobación plan de remediación Fase 1',
    description: 'Plan priorizado de remediación de controles críticos para el trimestre.',
    status: 'APPROVED',
    createdById: adminId,
    decidedById: clientId,
    decidedAt: addDays(timestamp, 3),
    signatureEnvelopeId: 'env-2024-001',
    signatureDocumentId: 'doc-2024-001',
    signatureUrl: 'https://sign.acme.example.com/envelopes/env-2024-001',
    signatureStatus: 'SIGNED',
    signatureSentAt: addDays(timestamp, 1),
    signatureCompletedAt: addDays(timestamp, 3),
    signatureDeclinedAt: null,
    createdAt: timestamp,
    updatedAt: addDays(timestamp, 3),
  });

  const initiatives = [
    {
      id: nextId('initiatives'),
      projectId,
      title: 'Automatización de conciliaciones bancarias',
      description: 'Implementación de robot RPA para conciliaciones diarias y alertas de excepciones.',
      type: 'PROJECT' as const,
      status: 'IN_PROGRESS' as const,
      resourceSummary: 'Equipo mixto de finanzas, TI y consultores con 60% dedicación.',
      startDate: timestamp,
      endDate: addDays(timestamp, 60),
      estimatedBudget: 18000,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextId('initiatives'),
      projectId,
      title: 'Capacitación en controles clave',
      description: 'Sesiones de formación para dueños de proceso y creación de manuales de operación.',
      type: 'QUICK_WIN' as const,
      status: 'PLANNED' as const,
      resourceSummary: 'Consultor senior y equipo de capital humano.',
      startDate: addDays(timestamp, 10),
      endDate: addDays(timestamp, 25),
      estimatedBudget: 4500,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  state.initiatives.push(...initiatives);

  state.initiativeAssignments.push(
    {
      id: nextId('initiativeAssignments'),
      initiativeId: initiatives[0].id,
      userId: consultantId,
      role: 'Líder de automatización',
      allocationPercentage: 60,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextId('initiativeAssignments'),
      initiativeId: initiatives[1].id,
      userId: adminId,
      role: 'Sponsor de capacitación',
      allocationPercentage: 20,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  );

  const consultants = [
    {
      id: nextId('consultants'),
      name: 'Laura Rivas',
      email: 'laura.rivas@acmeconsulting.com',
      title: 'Gerente de Riesgos',
      seniority: 'MANAGER' as const,
      practiceArea: 'Risk Advisory',
      skills: ['SOX', 'RPA', 'Gestión del cambio'],
      costRate: 85,
      billableRate: 180,
      weeklyCapacity: 40,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextId('consultants'),
      name: 'Diego Morales',
      email: 'diego.morales@acmeconsulting.com',
      title: 'Consultor Senior',
      seniority: 'SENIOR' as const,
      practiceArea: 'Automation',
      skills: ['Power Automate', 'SAP', 'Data Analytics'],
      costRate: 65,
      billableRate: 140,
      weeklyCapacity: 32,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  state.consultants.push(...consultants);

  state.staffingAssignments.push(
    {
      id: nextId('staffingAssignments'),
      consultantId: consultants[0].id,
      projectId,
      startDate: timestamp,
      endDate: addDays(timestamp, 45),
      allocation: 0.75,
      hoursPerWeek: 30,
      billable: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextId('staffingAssignments'),
      consultantId: consultants[1].id,
      projectId,
      startDate: addDays(timestamp, 3),
      endDate: null,
      allocation: 0.5,
      hoursPerWeek: 20,
      billable: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  );

  state.projectFinancialSettings.push({
    id: nextId('projectFinancialSettings'),
    projectId,
    billingModel: 'MILESTONE',
    currency: 'USD',
    paymentTerms: '30 días neto',
    lastUpdatedById: adminId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  state.billingScheduleItems.push(
    {
      id: nextId('billingScheduleItems'),
      projectId,
      type: 'MILESTONE',
      name: 'Entrega Diagnóstico Inicial',
      dueDate: addDays(timestamp, 15),
      amount: 25000,
      currency: 'USD',
      status: 'INVOICED',
      notes: 'Factura enviada el día 10',
      createdAt: timestamp,
      updatedAt: addDays(timestamp, 10),
    },
    {
      id: nextId('billingScheduleItems'),
      projectId,
      type: 'MILESTONE',
      name: 'Implementación RPA',
      dueDate: addDays(timestamp, 55),
      amount: 40000,
      currency: 'USD',
      status: 'PLANNED',
      notes: 'Dependiente de aprobación de presupuesto TI',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  );

  const documentId = nextId('projectDocuments');
  const documentVersionId = nextId('projectDocumentVersions');
  state.projectDocumentVersions.push({
    id: documentVersionId,
    documentId,
    version: 1,
    fileName: 'plan-remediacion-fase1-v1.docx',
    content: 'Plan detallado de actividades, responsables y cronograma.',
    checksum: 'b6f8d1e4',
    note: 'Versión inicial enviada a sponsor.',
    createdById: consultantId,
    createdAt: timestamp,
  });

  state.projectDocuments.push({
    id: documentId,
    projectId,
    title: 'Plan de remediación Fase 1',
    description: 'Documento que consolida acciones, responsables y dependencias para la primera fase.',
    category: 'DELIVERABLE',
    status: 'IN_REVIEW',
    tags: ['remediación', 'prioridad-alta'],
    createdById: consultantId,
    updatedById: consultantId,
    currentVersionId: documentVersionId,
    publishedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const templateId = nextId('templates');
  const templateRecord: Template = {
    id: templateId,
    name: 'Playbook de Control Interno',
    slug: 'playbook-control-interno',
    kind: 'PLAYBOOK',
    category: 'Gobernanza y Riesgos',
    description:
      'Guía estructurada para implementar controles internos críticos y establecer un programa de monitoreo continuo.',
    tags: ['controles', 'riesgos', 'madurez'],
    industries: ['Servicios Financieros', 'Retail'],
    maturity: 'ADVANCED',
    searchVector:
      'playbook control interno gobernanza riesgos guia controles riesgos madurez servicios financieros retail monitoreo continuo',
    createdById: adminId,
    updatedById: adminId,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentVersionId: null,
    currentVersionNumber: null,
    usageCount: 6,
    ratingSum: 26,
    ratingCount: 6,
  };
  state.templates.push(templateRecord);

  const templateVersionId = nextId('templateVersions');
  const templateVersion: TemplateVersion = {
    id: templateVersionId,
    templateId,
    versionNumber: 1,
    isMajor: true,
    changeLog: 'Versión inicial alineada al sprint 8',
    summary: 'Pasos detallados para evaluar, diseñar y activar controles internos prioritarios.',
    content:
      '1. Levantamiento de controles actuales\n2. Evaluación de madurez\n3. Diseño de plan de remediación\n4. Implementación y seguimiento',
    estimatedEffortHours: 80,
    recommendedRoles: ['Director Auditoría', 'Consultor Senior'],
    deliverables: ['Mapa de controles', 'Plan de remediación', 'Dashboard de seguimiento'],
    maturityFocus: 'ADVANCED',
    createdById: adminId,
    createdAt: timestamp,
  };
  state.templateVersions.push(templateVersion);
  templateRecord.currentVersionId = templateVersionId;
  templateRecord.currentVersionNumber = 1;

  state.templateUsages.push({
    id: nextId('templateUsages'),
    templateId,
    projectId,
    usedById: consultantId,
    rating: 5,
    notes: 'Plantilla muy útil para estandarizar la documentación de controles.',
    observedBenefits: ['Reducción del tiempo de diseño', 'Mejor trazabilidad de riesgos'],
    createdAt: addDays(timestamp, 2),
  });
  templateRecord.usageCount += 1;
  templateRecord.ratingSum += 5;
  templateRecord.ratingCount += 1;

  state.benchmarkSnapshots.push({
    id: nextId('benchmarkSnapshots'),
    projectId,
    generatedAt: addDays(timestamp, -1),
    metrics: {
      maturityScore: 62,
      controlCoverage: 0.68,
      automationIndex: 0.45,
    },
    comparisons: {
      industryPercentile: 55,
      peerGroupDelta: {
        controlCoverage: -0.07,
        automationIndex: 0.1,
      },
    },
    insights: [
      {
        id: 'insight-automation',
        title: 'Automatización por debajo del promedio',
        description: 'Las empresas top quartile tienen 30% más procesos automatizados en conciliaciones.',
        impact: 4,
        tags: ['automatización', 'benchmark'],
      },
      {
        id: 'insight-governance',
        title: 'Frecuencia de comités adecuada',
        description: 'El programa mantiene cadencia mensual alineada a las mejores prácticas de la industria.',
        impact: 3,
        tags: ['gobernanza'],
      },
    ],
  });

  state.benchmarkFeedback.push({
    id: nextId('benchmarkFeedback'),
    projectId,
    userId: clientId,
    usefulness: 4,
    confidence: 3,
    comment: 'El benchmark destaca claramente dónde enfocar inversiones en automatización.',
    submittedAt: addDays(timestamp, 1),
  });

  const connectorBaseConfig = {
    sandboxUrl: 'https://sandbox.integration.local',
    batchWindow: '0 3 * * *',
    retentionDays: 30,
  };

  const sapConnector: IntegrationConnector = {
    id: nextId('integrationConnectors'),
    key: 'sap-s4hana',
    name: 'SAP S/4HANA ERP',
    vendor: 'SAP',
    type: 'ERP',
    protocol: 'REST',
    authType: 'OAUTH2',
    capabilities: ['master-data', 'financials', 'real-time-sync'],
    supportedEntities: ['GLAccounts', 'CostCenters', 'Vendors'],
    configuration: {
      ...connectorBaseConfig,
      baseUrl: 'https://sap.example.com/api',
    },
    status: 'READY',
    lastSyncedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.integrationConnectors.push(sapConnector);

  const salesforceConnector: IntegrationConnector = {
    id: nextId('integrationConnectors'),
    key: 'salesforce-crm',
    name: 'Salesforce CRM',
    vendor: 'Salesforce',
    type: 'CRM',
    protocol: 'GRAPHQL',
    authType: 'OAUTH2',
    capabilities: ['pipeline', 'accounts', 'activity-stream'],
    supportedEntities: ['Opportunities', 'Accounts', 'Tasks'],
    configuration: {
      ...connectorBaseConfig,
      baseUrl: 'https://salesforce.example.com/graphql',
    },
    status: 'CONNECTED',
    lastSyncedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.integrationConnectors.push(salesforceConnector);

  const datasetId = nextId('biDatasets');
  const dataset: BiDataset = {
    id: datasetId,
    connectorId: salesforceConnector.id,
    name: 'Salesforce Pipeline Health',
    format: 'POWER_BI',
    schemaVersion: '2024.1',
    content: {
      measures: [
        { name: 'WinRate', expression: 'WonDeals / TotalDeals' },
        { name: 'AverageCycle', expression: 'AVERAGE(Opportunity[CloseDate] - Opportunity[CreatedDate])' },
      ],
      dimensions: ['OpportunityStage', 'Industry', 'OwnerRole'],
    },
    createdAt: timestamp,
  };
  state.biDatasets.push(dataset);

  state.connectorSyncRuns.push({
    id: nextId('connectorSyncRuns'),
    connectorId: salesforceConnector.id,
    startedAt: timestamp,
    finishedAt: timestamp,
    status: 'SUCCESS',
    recordsPulled: 1240,
    errorMessage: null,
    datasetId,
  });
};

const resetState = () => {
  const globalForPrisma = globalThis as GlobalPrismaState;
  state = createEmptyState();
  globalForPrisma.__PRISMA_STATE__ = state;
  seed();
};

if (state.users.length === 0 && Object.keys(state.sequences).length === 0) {
  seed();
}

const logOperation = (model: string, action: string, payload: unknown) => {
  logger.debug({ model, action, payload }, 'db operation');
};

class TenantModel {
  async findMany(): Promise<Tenant[]> {
    return state.tenants.map((tenant) => ({ ...tenant }));
  }

  async findUnique(params: { where: { id?: number; slug?: string } }): Promise<Tenant | null> {
    const { id, slug } = params.where;
    const tenant = state.tenants.find((item) => (id ? item.id === id : true) && (slug ? item.slug === slug : true));
    return tenant ? { ...tenant } : null;
  }

  async create(params: { data: { name: string; slug: string; industry?: string | null; status?: TenantStatus } }): Promise<Tenant> {
    if (state.tenants.some((tenant) => tenant.slug === params.data.slug)) {
      throw new Error('Tenant slug already exists');
    }
    const timestamp = now();
    const tenant: Tenant = {
      id: nextId('tenants'),
      name: params.data.name,
      slug: params.data.slug,
      industry: params.data.industry ?? null,
      status: params.data.status ?? 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.tenants.push(tenant);
    logOperation('tenant', 'create', { id: tenant.id, slug: tenant.slug });
    return { ...tenant };
  }

  async update(params: { where: { id: number }; data: Partial<Omit<Tenant, 'id' | 'createdAt'>> }): Promise<Tenant> {
    const tenant = state.tenants.find((item) => item.id === params.where.id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    if (params.data.name !== undefined) {
      tenant.name = params.data.name;
    }
    if (params.data.slug !== undefined) {
      if (state.tenants.some((other) => other.id !== tenant.id && other.slug === params.data.slug)) {
        throw new Error('Tenant slug already exists');
      }
      tenant.slug = params.data.slug;
    }
    if (params.data.industry !== undefined) {
      tenant.industry = params.data.industry;
    }
    if (params.data.status !== undefined) {
      tenant.status = params.data.status;
    }
    tenant.updatedAt = now();
    logOperation('tenant', 'update', { id: tenant.id });
    return { ...tenant };
  }
}

class TenantAreaModel {
  async findMany(params: { where: { tenantId: number } }): Promise<TenantArea[]> {
    return state.tenantAreas
      .filter((area) => area.tenantId === params.where.tenantId)
      .map((area) => ({ ...area }));
  }

  async create(params: {
    data: { tenantId: number; name: string; description?: string | null; parentAreaId?: number | null };
  }): Promise<TenantArea> {
    const timestamp = now();
    const area: TenantArea = {
      id: nextId('tenantAreas'),
      tenantId: params.data.tenantId,
      name: params.data.name,
      description: params.data.description ?? null,
      parentAreaId: params.data.parentAreaId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.tenantAreas.push(area);
    logOperation('tenantArea', 'create', { id: area.id, tenantId: area.tenantId });
    return { ...area };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<TenantArea, 'name' | 'description' | 'parentAreaId'>>;
  }): Promise<TenantArea> {
    const area = state.tenantAreas.find((item) => item.id === params.where.id);
    if (!area) {
      throw new Error('Tenant area not found');
    }
    if (params.data.name !== undefined) {
      area.name = params.data.name;
    }
    if (params.data.description !== undefined) {
      area.description = params.data.description;
    }
    if (params.data.parentAreaId !== undefined) {
      area.parentAreaId = params.data.parentAreaId;
    }
    area.updatedAt = now();
    logOperation('tenantArea', 'update', { id: area.id });
    return { ...area };
  }
}

class ContractModel {
  async findMany(params: { where: { tenantId?: number; status?: ContractStatus } }): Promise<Contract[]> {
    const { tenantId, status } = params.where;
    return state.contracts
      .filter((contract) => (tenantId ? contract.tenantId === tenantId : true))
      .filter((contract) => (status ? contract.status === status : true))
      .map((contract) => ({ ...contract }));
  }

  async create(params: {
    data: {
      tenantId: number;
      code: string;
      title: string;
      status?: ContractStatus;
      startDate: Date;
      endDate?: Date | null;
      value?: number | null;
      currency?: CurrencyCode | null;
    };
  }): Promise<Contract> {
    if (state.contracts.some((contract) => contract.code === params.data.code)) {
      throw new Error('Contract code already exists');
    }
    const timestamp = now();
    const contract: Contract = {
      id: nextId('contracts'),
      tenantId: params.data.tenantId,
      code: params.data.code,
      title: params.data.title,
      status: params.data.status ?? 'DRAFT',
      startDate: params.data.startDate,
      endDate: params.data.endDate ?? null,
      value: params.data.value ?? null,
      currency: params.data.currency ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.contracts.push(contract);
    logOperation('contract', 'create', { id: contract.id, code: contract.code });
    return { ...contract };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<Contract, 'title' | 'status' | 'startDate' | 'endDate' | 'value' | 'currency'>>;
  }): Promise<Contract> {
    const contract = state.contracts.find((item) => item.id === params.where.id);
    if (!contract) {
      throw new Error('Contract not found');
    }
    if (params.data.title !== undefined) {
      contract.title = params.data.title;
    }
    if (params.data.status !== undefined) {
      contract.status = params.data.status;
    }
    if (params.data.startDate !== undefined) {
      contract.startDate = params.data.startDate;
    }
    if (params.data.endDate !== undefined) {
      contract.endDate = params.data.endDate;
    }
    if (params.data.value !== undefined) {
      contract.value = params.data.value;
    }
    if (params.data.currency !== undefined) {
      contract.currency = params.data.currency;
    }
    contract.updatedAt = now();
    logOperation('contract', 'update', { id: contract.id });
    return { ...contract };
  }
}

class UserModel {
  async findUnique(params: { where: { id?: number; email?: string } }): Promise<User | null> {
    const { id, email } = params.where;
    const hasIdFilter = Object.prototype.hasOwnProperty.call(params.where, 'id');
    const isValidId = id !== undefined && id !== null && !Number.isNaN(id);

    if (hasIdFilter && !isValidId) {
      return null;
    }

    const user = state.users.find((item) => {
      const matchesId = isValidId ? item.id === id : true;
      const matchesEmail = email !== undefined ? item.email === email : true;
      return matchesId && matchesEmail;
    });
    return user ?? null;
  }

  async findMany(): Promise<User[]> {
    return [...state.users];
  }

  async create(params: { data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts' | 'lockedUntil'> & Partial<Pick<User, 'failedLoginAttempts' | 'lockedUntil'>> }): Promise<User> {
    const timestamp = now();
    const user: User = {
      id: nextId('users'),
      email: params.data.email,
      passwordHash: params.data.passwordHash,
      role: params.data.role,
      failedLoginAttempts: params.data.failedLoginAttempts ?? 0,
      lockedUntil: params.data.lockedUntil ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.users.push(user);
    logOperation('user', 'create', { id: user.id, email: user.email });
    return user;
  }

  async update(params: { where: { id: number }; data: Partial<Omit<User, 'id' | 'createdAt'>> }): Promise<User> {
    const user = state.users.find((item) => item.id === params.where.id);
    if (!user) {
      throw new Error('User not found');
    }
    if (params.data.email !== undefined) {
      user.email = params.data.email;
    }
    if (params.data.passwordHash !== undefined) {
      user.passwordHash = params.data.passwordHash;
    }
    if (params.data.role !== undefined) {
      user.role = params.data.role as UserRole;
    }
    if (params.data.failedLoginAttempts !== undefined) {
      user.failedLoginAttempts = params.data.failedLoginAttempts;
    }
    if (params.data.lockedUntil !== undefined) {
      user.lockedUntil = params.data.lockedUntil;
    }
    user.updatedAt = now();
    logOperation('user', 'update', { id: user.id });
    return { ...user };
  }
}

class CompanyModel {
  async findUnique(params: { where: { id?: number; name?: string } }): Promise<Company | null> {
    const { id, name } = params.where;
    const company = state.companies.find((item) => (id ? item.id === id : true) && (name ? item.name === name : true));
    return company ?? null;
  }

  async findMany(): Promise<Company[]> {
    return [...state.companies];
  }

  async create(params: { data: { name: string } }): Promise<Company> {
    const timestamp = now();
    const company: Company = {
      id: nextId('companies'),
      name: params.data.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.companies.push(company);
    logOperation('company', 'create', { id: company.id, name: company.name });
    return company;
  }

  async update(params: { where: { id: number }; data: Partial<Pick<Company, 'name'>> }): Promise<Company> {
    const company = state.companies.find((item) => item.id === params.where.id);
    if (!company) {
      throw new Error('Company not found');
    }
    if (params.data.name !== undefined) {
      company.name = params.data.name;
    }
    company.updatedAt = now();
    logOperation('company', 'update', { id: company.id });
    return { ...company };
  }
}

class ProjectModel {
  async findUnique(params: { where: { id: number } }): Promise<Project | null> {
    return state.projects.find((item) => item.id === params.where.id) ?? null;
  }

  async findMany(params?: { where?: { companyId?: number; userId?: number } }): Promise<Project[]> {
    const { where } = params ?? {};
    let projects = [...state.projects];
    if (where?.companyId) {
      projects = projects.filter((project) => project.companyId === where.companyId);
    }
    if (where?.userId) {
      const membershipProjectIds = state.memberships.filter((membership) => membership.userId === where.userId).map((membership) => membership.projectId);
      projects = projects.filter((project) => membershipProjectIds.includes(project.id));
    }
    return projects.map((project) => ({ ...project }));
  }

  async create(params: { data: { companyId: number; name: string; description?: string | null; createdById: number } }): Promise<Project> {
    if (state.projects.some((project) => project.companyId === params.data.companyId && project.name.toLowerCase() === params.data.name.toLowerCase())) {
      throw new Error('Project already exists for this company');
    }
    const timestamp = now();
    const project: Project = {
      id: nextId('projects'),
      companyId: params.data.companyId,
      name: params.data.name,
      description: params.data.description ?? null,
      createdById: params.data.createdById,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.projects.push(project);
    logOperation('project', 'create', { id: project.id, companyId: project.companyId });
    return { ...project };
  }

  async update(params: { where: { id: number }; data: Partial<Pick<Project, 'name' | 'description'>> }): Promise<Project> {
    const project = state.projects.find((item) => item.id === params.where.id);
    if (!project) {
      throw new Error('Project not found');
    }
    if (params.data.name) {
      if (state.projects.some((other) => other.id !== project.id && other.companyId === project.companyId && other.name.toLowerCase() === params.data.name!.toLowerCase())) {
        throw new Error('Project already exists for this company');
      }
      project.name = params.data.name;
    }
    if (params.data.description !== undefined) {
      project.description = params.data.description;
    }
    project.updatedAt = now();
    logOperation('project', 'update', { id: project.id });
    return { ...project };
  }
}

class MembershipModel {
  async findMany(params: { where: { userId?: number; projectId?: number } }): Promise<Membership[]> {
    const { where } = params;
    return state.memberships.filter((membership) => (where.userId ? membership.userId === where.userId : true) && (where.projectId ? membership.projectId === where.projectId : true)).map((membership) => ({ ...membership }));
  }

  async create(params: { data: { userId: number; projectId: number; role: UserRole } }): Promise<Membership> {
    const membership: Membership = {
      id: nextId('memberships'),
      projectId: params.data.projectId,
      userId: params.data.userId,
      role: params.data.role,
      createdAt: now(),
    };
    state.memberships.push(membership);
    logOperation('membership', 'create', { id: membership.id, projectId: membership.projectId, userId: membership.userId });
    return { ...membership };
  }
}

class ProjectCategoryModel {
  async findMany(params: { where: { projectId: number } }): Promise<ProjectCategory[]> {
    return state.projectCategories
      .filter((category) => category.projectId === params.where.projectId)
      .map((category) => ({ ...category }));
  }

  async create(params: { data: { projectId: number; name: string; description?: string | null } }): Promise<ProjectCategory> {
    const category: ProjectCategory = {
      id: nextId('projectCategories'),
      projectId: params.data.projectId,
      name: params.data.name,
      description: params.data.description ?? null,
      createdAt: now(),
    };
    state.projectCategories.push(category);
    logOperation('projectCategory', 'create', { id: category.id, projectId: category.projectId });
    return { ...category };
  }
}

class ProjectRiskModel {
  async findMany(params: { where: { projectId: number } }): Promise<ProjectRisk[]> {
    return state.projectRisks
      .filter((risk) => risk.projectId === params.where.projectId)
      .map((risk) => ({ ...risk }));
  }

  async create(params: {
    data: {
      projectId: number;
      categoryId?: number | null;
      title: string;
      description?: string | null;
      severity: RiskLevel;
      likelihood: RiskLevel;
      urgency: RiskLevel;
      complexity: RiskLevel;
      status?: RiskStatus;
      process?: string | null;
      system?: string | null;
      dataRequestId?: number | null;
    };
  }): Promise<ProjectRisk> {
    const risk: ProjectRisk = {
      id: nextId('projectRisks'),
      projectId: params.data.projectId,
      categoryId: params.data.categoryId ?? null,
      title: params.data.title,
      description: params.data.description ?? null,
      severity: params.data.severity,
      likelihood: params.data.likelihood,
      urgency: params.data.urgency,
      complexity: params.data.complexity,
      status: params.data.status ?? 'OPEN',
      process: params.data.process ?? null,
      system: params.data.system ?? null,
      dataRequestId: params.data.dataRequestId ?? null,
      createdAt: now(),
    };
    state.projectRisks.push(risk);
    logOperation('projectRisk', 'create', { id: risk.id, projectId: risk.projectId });
    return { ...risk };
  }

  async findUnique(params: { where: { id: number } }): Promise<ProjectRisk | null> {
    const risk = state.projectRisks.find((item) => item.id === params.where.id);
    return risk ? { ...risk } : null;
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Pick<
        ProjectRisk,
        'title' | 'description' | 'severity' | 'likelihood' | 'urgency' | 'complexity' | 'status' | 'process' | 'system' | 'dataRequestId'
      >
    >;
  }): Promise<ProjectRisk> {
    const risk = state.projectRisks.find((item) => item.id === params.where.id);
    if (!risk) {
      throw new Error('Risk not found');
    }
    if (params.data.title !== undefined) {
      risk.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      risk.description = params.data.description;
    }
    if (params.data.severity !== undefined) {
      risk.severity = params.data.severity;
    }
    if (params.data.likelihood !== undefined) {
      risk.likelihood = params.data.likelihood;
    }
    if (params.data.urgency !== undefined) {
      risk.urgency = params.data.urgency;
    }
    if (params.data.complexity !== undefined) {
      risk.complexity = params.data.complexity;
    }
    if (params.data.status !== undefined) {
      risk.status = params.data.status;
    }
    if (params.data.process !== undefined) {
      risk.process = params.data.process;
    }
    if (params.data.system !== undefined) {
      risk.system = params.data.system;
    }
    if (params.data.dataRequestId !== undefined) {
      risk.dataRequestId = params.data.dataRequestId;
    }
    logOperation('projectRisk', 'update', { id: risk.id });
    return { ...risk };
  }
}

class ProjectChecklistModel {
  async findMany(params: { where: { projectId: number } }): Promise<ProjectChecklist[]> {
    return state.projectChecklists
      .filter((checklist) => checklist.projectId === params.where.projectId)
      .map((checklist) => ({ ...checklist }));
  }

  async create(params: { data: { projectId: number; name: string; dueDate?: Date | null; status?: ChecklistStatus } }): Promise<ProjectChecklist> {
    const checklist: ProjectChecklist = {
      id: nextId('projectChecklists'),
      projectId: params.data.projectId,
      name: params.data.name,
      dueDate: params.data.dueDate ?? null,
      status: params.data.status ?? 'PENDING',
      createdAt: now(),
    };
    state.projectChecklists.push(checklist);
    logOperation('projectChecklist', 'create', { id: checklist.id, projectId: checklist.projectId });
    return { ...checklist };
  }
}

class ProjectKpiModel {
  async findMany(params: { where: { projectId: number } }): Promise<ProjectKpi[]> {
    return state.projectKpis
      .filter((kpi) => kpi.projectId === params.where.projectId)
      .map((kpi) => ({ ...kpi }));
  }

  async create(params: { data: { projectId: number; name: string; target: number; current?: number; unit?: string; trend?: 'UP' | 'DOWN' | 'STABLE' } }): Promise<ProjectKpi> {
    const kpi: ProjectKpi = {
      id: nextId('projectKpis'),
      projectId: params.data.projectId,
      name: params.data.name,
      target: params.data.target,
      current: params.data.current ?? 0,
      unit: params.data.unit ?? '%',
      trend: params.data.trend ?? 'STABLE',
      createdAt: now(),
    };
    state.projectKpis.push(kpi);
    logOperation('projectKpi', 'create', { id: kpi.id, projectId: kpi.projectId });
    return { ...kpi };
  }
}

class GovernanceEventModel {
  async findMany(params: { where: { projectId: number } }): Promise<GovernanceEvent[]> {
    return state.governanceEvents
      .filter((event) => event.projectId === params.where.projectId)
      .map((event) => ({ ...event }));
  }

  async create(params: {
    data: {
      projectId: number;
      type: GovernanceType;
      name: string;
      cadence: GovernanceCadence;
      owner: string;
      nextMeetingAt?: Date | null;
    };
  }): Promise<GovernanceEvent> {
    const event: GovernanceEvent = {
      id: nextId('governanceEvents'),
      projectId: params.data.projectId,
      type: params.data.type,
      name: params.data.name,
      cadence: params.data.cadence,
      owner: params.data.owner,
      nextMeetingAt: params.data.nextMeetingAt ?? null,
      createdAt: now(),
    };
    state.governanceEvents.push(event);
    logOperation('governanceEvent', 'create', { id: event.id, projectId: event.projectId, type: event.type });
    return { ...event };
  }
}

class DataRequestModel {
  async findMany(params: { where: { projectId?: number; status?: DataRequestStatus } }): Promise<DataRequest[]> {
    const { where } = params;
    return state.dataRequests
      .filter((request) => (where.projectId ? request.projectId === where.projectId : true))
      .filter((request) => (where.status ? request.status === where.status : true))
      .map((request) => ({ ...request }));
  }

  async findUnique(params: { where: { id: number } }): Promise<DataRequest | null> {
    const request = state.dataRequests.find((item) => item.id === params.where.id);
    return request ? { ...request } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      title: string;
      description?: string | null;
      dueDate?: Date | null;
      status?: DataRequestStatus;
      createdById: number;
      assignedToId?: number | null;
    };
  }): Promise<DataRequest> {
    const timestamp = now();
    const dataRequest: DataRequest = {
      id: nextId('dataRequests'),
      projectId: params.data.projectId,
      title: params.data.title,
      description: params.data.description ?? null,
      dueDate: params.data.dueDate ?? null,
      status: params.data.status ?? 'PENDING',
      createdById: params.data.createdById,
      assignedToId: params.data.assignedToId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.dataRequests.push(dataRequest);
    logOperation('dataRequest', 'create', { id: dataRequest.id, projectId: dataRequest.projectId });
    return { ...dataRequest };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<DataRequest, 'title' | 'description' | 'dueDate' | 'status' | 'assignedToId'>>;
  }): Promise<DataRequest> {
    const dataRequest = state.dataRequests.find((item) => item.id === params.where.id);
    if (!dataRequest) {
      throw new Error('Data request not found');
    }
    if (params.data.title !== undefined) {
      dataRequest.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      dataRequest.description = params.data.description;
    }
    if (params.data.dueDate !== undefined) {
      dataRequest.dueDate = params.data.dueDate;
    }
    if (params.data.status !== undefined) {
      dataRequest.status = params.data.status;
    }
    if (params.data.assignedToId !== undefined) {
      dataRequest.assignedToId = params.data.assignedToId;
    }
    dataRequest.updatedAt = now();
    logOperation('dataRequest', 'update', { id: dataRequest.id });
    return { ...dataRequest };
  }
}

class DataRequestAttachmentModel {
  async findMany(params: { where: { dataRequestId: number } }): Promise<DataRequestAttachment[]> {
    return state.dataRequestAttachments
      .filter((attachment) => attachment.dataRequestId === params.where.dataRequestId)
      .map((attachment) => ({ ...attachment }));
  }

  async create(params: {
    data: { dataRequestId: number; fileName: string; content: string; uploadedById: number };
  }): Promise<DataRequestAttachment> {
    const attachment: DataRequestAttachment = {
      id: nextId('dataRequestAttachments'),
      dataRequestId: params.data.dataRequestId,
      fileName: params.data.fileName,
      content: params.data.content,
      uploadedById: params.data.uploadedById,
      uploadedAt: now(),
    };
    state.dataRequestAttachments.push(attachment);
    logOperation('dataRequestAttachment', 'create', { id: attachment.id, dataRequestId: attachment.dataRequestId });
    return { ...attachment };
  }
}

class FindingModel {
  async findMany(params: { where: { projectId?: number; riskId?: number } }): Promise<Finding[]> {
    const { where } = params;
    return state.findings
      .filter((finding) => (where.projectId ? finding.projectId === where.projectId : true))
      .filter((finding) => (where.riskId ? finding.riskId === where.riskId : true))
      .map((finding) => ({ ...finding }));
  }

  async findUnique(params: { where: { id: number } }): Promise<Finding | null> {
    const finding = state.findings.find((item) => item.id === params.where.id);
    return finding ? { ...finding } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      riskId: number;
      dataRequestId?: number | null;
      title: string;
      description?: string | null;
      status?: FindingStatus;
      createdById: number;
    };
  }): Promise<Finding> {
    const timestamp = now();
    const finding: Finding = {
      id: nextId('findings'),
      projectId: params.data.projectId,
      riskId: params.data.riskId,
      dataRequestId: params.data.dataRequestId ?? null,
      title: params.data.title,
      description: params.data.description ?? null,
      status: params.data.status ?? 'OPEN',
      createdById: params.data.createdById,
      updatedAt: timestamp,
      createdAt: timestamp,
    };
    state.findings.push(finding);
    logOperation('finding', 'create', { id: finding.id, projectId: finding.projectId });
    return { ...finding };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<Finding, 'title' | 'description' | 'status' | 'dataRequestId'>>;
  }): Promise<Finding> {
    const finding = state.findings.find((item) => item.id === params.where.id);
    if (!finding) {
      throw new Error('Finding not found');
    }
    if (params.data.title !== undefined) {
      finding.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      finding.description = params.data.description;
    }
    if (params.data.status !== undefined) {
      finding.status = params.data.status;
    }
    if (params.data.dataRequestId !== undefined) {
      finding.dataRequestId = params.data.dataRequestId;
    }
    finding.updatedAt = now();
    logOperation('finding', 'update', { id: finding.id });
    return { ...finding };
  }
}

class ApprovalModel {
  async findMany(params: { where: { projectId: number } }): Promise<Approval[]> {
    return state.approvals
      .filter((approval) => approval.projectId === params.where.projectId)
      .map((approval) => ({ ...approval }));
  }

  async findUnique(params: { where: { id?: number; signatureEnvelopeId?: string } }): Promise<Approval | null> {
    const { id, signatureEnvelopeId } = params.where;
    const approval = state.approvals.find(
      (item) =>
        (id === undefined || item.id === id) &&
        (signatureEnvelopeId === undefined || item.signatureEnvelopeId === signatureEnvelopeId)
    );
    return approval ? { ...approval } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      title: string;
      description?: string | null;
      status?: ApprovalStatus;
      createdById: number;
      signatureEnvelopeId?: string | null;
      signatureDocumentId?: string | null;
      signatureUrl?: string | null;
      signatureStatus?: SignatureStatus;
      signatureSentAt?: Date | null;
      signatureCompletedAt?: Date | null;
      signatureDeclinedAt?: Date | null;
    };
  }): Promise<Approval> {
    const timestamp = now();
    const approval: Approval = {
      id: nextId('approvals'),
      projectId: params.data.projectId,
      title: params.data.title,
      description: params.data.description ?? null,
      status: params.data.status ?? 'PENDING',
      createdById: params.data.createdById,
      decidedById: null,
      decidedAt: null,
      signatureEnvelopeId: params.data.signatureEnvelopeId ?? null,
      signatureDocumentId: params.data.signatureDocumentId ?? null,
      signatureUrl: params.data.signatureUrl ?? null,
      signatureStatus: params.data.signatureStatus ?? 'PENDING',
      signatureSentAt: params.data.signatureSentAt ?? null,
      signatureCompletedAt: params.data.signatureCompletedAt ?? null,
      signatureDeclinedAt: params.data.signatureDeclinedAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.approvals.push(approval);
    logOperation('approval', 'create', { id: approval.id, projectId: approval.projectId });
    return { ...approval };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Pick<
        Approval,
        | 'title'
        | 'description'
        | 'status'
        | 'decidedById'
        | 'decidedAt'
        | 'signatureEnvelopeId'
        | 'signatureDocumentId'
        | 'signatureUrl'
        | 'signatureStatus'
        | 'signatureSentAt'
        | 'signatureCompletedAt'
        | 'signatureDeclinedAt'
      >
    >;
  }): Promise<Approval> {
    const approval = state.approvals.find((item) => item.id === params.where.id);
    if (!approval) {
      throw new Error('Approval not found');
    }
    if (params.data.title !== undefined) {
      approval.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      approval.description = params.data.description;
    }
    if (params.data.status !== undefined) {
      approval.status = params.data.status;
    }
    if (params.data.decidedById !== undefined) {
      approval.decidedById = params.data.decidedById;
    }
    if (params.data.decidedAt !== undefined) {
      approval.decidedAt = params.data.decidedAt;
    }
    if (params.data.signatureEnvelopeId !== undefined) {
      approval.signatureEnvelopeId = params.data.signatureEnvelopeId;
    }
    if (params.data.signatureDocumentId !== undefined) {
      approval.signatureDocumentId = params.data.signatureDocumentId;
    }
    if (params.data.signatureUrl !== undefined) {
      approval.signatureUrl = params.data.signatureUrl;
    }
    if (params.data.signatureStatus !== undefined) {
      approval.signatureStatus = params.data.signatureStatus;
    }
    if (params.data.signatureSentAt !== undefined) {
      approval.signatureSentAt = params.data.signatureSentAt;
    }
    if (params.data.signatureCompletedAt !== undefined) {
      approval.signatureCompletedAt = params.data.signatureCompletedAt;
    }
    if (params.data.signatureDeclinedAt !== undefined) {
      approval.signatureDeclinedAt = params.data.signatureDeclinedAt;
    }
    approval.updatedAt = now();
    logOperation('approval', 'update', { id: approval.id });
    return { ...approval };
  }
}

class InitiativeModel {
  async findMany(params: { where: { projectId?: number } }): Promise<Initiative[]> {
    const { projectId } = params.where;
    return state.initiatives
      .filter((initiative) => (projectId ? initiative.projectId === projectId : true))
      .map((initiative) => ({ ...initiative }));
  }

  async findUnique(params: { where: { id: number } }): Promise<Initiative | null> {
    const initiative = state.initiatives.find((item) => item.id === params.where.id);
    return initiative ? { ...initiative } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      title: string;
      description?: string | null;
      type: InitiativeType;
      status?: InitiativeStatus;
      resourceSummary: string;
      startDate: Date;
      endDate: Date;
      estimatedBudget?: number | null;
    };
  }): Promise<Initiative> {
    const timestamp = now();
    const initiative: Initiative = {
      id: nextId('initiatives'),
      projectId: params.data.projectId,
      title: params.data.title,
      description: params.data.description ?? null,
      type: params.data.type,
      status: params.data.status ?? 'PLANNED',
      resourceSummary: params.data.resourceSummary,
      startDate: params.data.startDate,
      endDate: params.data.endDate,
      estimatedBudget: params.data.estimatedBudget ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.initiatives.push(initiative);
    logOperation('initiative', 'create', { id: initiative.id, projectId: initiative.projectId, type: initiative.type });
    return { ...initiative };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Pick<
        Initiative,
        'title' | 'description' | 'type' | 'status' | 'resourceSummary' | 'startDate' | 'endDate' | 'estimatedBudget'
      >
    >;
  }): Promise<Initiative> {
    const initiative = state.initiatives.find((item) => item.id === params.where.id);
    if (!initiative) {
      throw new Error('Initiative not found');
    }
    if (params.data.title !== undefined) {
      initiative.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      initiative.description = params.data.description;
    }
    if (params.data.type !== undefined) {
      initiative.type = params.data.type;
    }
    if (params.data.status !== undefined) {
      initiative.status = params.data.status;
    }
    if (params.data.resourceSummary !== undefined) {
      initiative.resourceSummary = params.data.resourceSummary;
    }
    if (params.data.startDate !== undefined) {
      initiative.startDate = params.data.startDate;
    }
    if (params.data.endDate !== undefined) {
      initiative.endDate = params.data.endDate;
    }
    if (params.data.estimatedBudget !== undefined) {
      initiative.estimatedBudget = params.data.estimatedBudget;
    }
    initiative.updatedAt = now();
    logOperation('initiative', 'update', { id: initiative.id });
    return { ...initiative };
  }

  async delete(params: { where: { id: number } }): Promise<Initiative> {
    const index = state.initiatives.findIndex((item) => item.id === params.where.id);
    if (index === -1) {
      throw new Error('Initiative not found');
    }
    const [removed] = state.initiatives.splice(index, 1);
    logOperation('initiative', 'delete', { id: removed.id });
    return { ...removed };
  }
}

class InitiativeAssignmentModel {
  async findMany(params: { where: { initiativeId?: number } }): Promise<InitiativeAssignment[]> {
    const { initiativeId } = params.where;
    return state.initiativeAssignments
      .filter((assignment) => (initiativeId ? assignment.initiativeId === initiativeId : true))
      .map((assignment) => ({ ...assignment }));
  }

  async create(params: {
    data: { initiativeId: number; userId: number; role: string; allocationPercentage: number };
  }): Promise<InitiativeAssignment> {
    const timestamp = now();
    const assignment: InitiativeAssignment = {
      id: nextId('initiativeAssignments'),
      initiativeId: params.data.initiativeId,
      userId: params.data.userId,
      role: params.data.role,
      allocationPercentage: params.data.allocationPercentage,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.initiativeAssignments.push(assignment);
    logOperation('initiativeAssignment', 'create', {
      id: assignment.id,
      initiativeId: assignment.initiativeId,
      userId: assignment.userId,
    });
    return { ...assignment };
  }

  async deleteMany(params: { where: { initiativeId: number } }): Promise<void> {
    state.initiativeAssignments = state.initiativeAssignments.filter(
      (assignment) => assignment.initiativeId !== params.where.initiativeId
    );
    logOperation('initiativeAssignment', 'deleteMany', { initiativeId: params.where.initiativeId });
  }
}

class ConsultantModel {
  async findMany(): Promise<Consultant[]> {
    return state.consultants.map((consultant) => ({ ...consultant, skills: [...consultant.skills] }));
  }

  async findUnique(params: { where: { id?: number; email?: string } }): Promise<Consultant | null> {
    const { id, email } = params.where;
    const consultant = state.consultants.find((item) => {
      if (id !== undefined) {
        return item.id === id;
      }
      if (email !== undefined) {
        return item.email.toLowerCase() === email.toLowerCase();
      }
      return false;
    });
    return consultant ? { ...consultant, skills: [...consultant.skills] } : null;
  }

  async create(params: {
    data: {
      name: string;
      email: string;
      title: string;
      seniority: ConsultantSeniority;
      practiceArea: string;
      skills?: string[];
      costRate: number;
      billableRate: number;
      weeklyCapacity: number;
      isActive?: boolean;
    };
  }): Promise<Consultant> {
    if (state.consultants.some((consultant) => consultant.email.toLowerCase() === params.data.email.toLowerCase())) {
      throw new Error('Consultant email already exists');
    }
    const timestamp = now();
    const consultant: Consultant = {
      id: nextId('consultants'),
      name: params.data.name,
      email: params.data.email,
      title: params.data.title,
      seniority: params.data.seniority,
      practiceArea: params.data.practiceArea,
      skills: params.data.skills ? [...params.data.skills] : [],
      costRate: params.data.costRate,
      billableRate: params.data.billableRate,
      weeklyCapacity: params.data.weeklyCapacity,
      isActive: params.data.isActive ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.consultants.push(consultant);
    logOperation('consultant', 'create', { id: consultant.id, email: consultant.email });
    return { ...consultant, skills: [...consultant.skills] };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Pick<
        Consultant,
        'name' | 'email' | 'title' | 'seniority' | 'practiceArea' | 'skills' | 'costRate' | 'billableRate' | 'weeklyCapacity' | 'isActive'
      >
    >;
  }): Promise<Consultant> {
    const consultant = state.consultants.find((item) => item.id === params.where.id);
    if (!consultant) {
      throw new Error('Consultant not found');
    }
    if (params.data.email !== undefined && params.data.email.toLowerCase() !== consultant.email.toLowerCase()) {
      if (state.consultants.some((other) => other.id !== consultant.id && other.email.toLowerCase() === params.data.email!.toLowerCase())) {
        throw new Error('Consultant email already exists');
      }
      consultant.email = params.data.email;
    }
    if (params.data.name !== undefined) {
      consultant.name = params.data.name;
    }
    if (params.data.title !== undefined) {
      consultant.title = params.data.title;
    }
    if (params.data.seniority !== undefined) {
      consultant.seniority = params.data.seniority;
    }
    if (params.data.practiceArea !== undefined) {
      consultant.practiceArea = params.data.practiceArea;
    }
    if (params.data.skills !== undefined) {
      consultant.skills = [...params.data.skills];
    }
    if (params.data.costRate !== undefined) {
      consultant.costRate = params.data.costRate;
    }
    if (params.data.billableRate !== undefined) {
      consultant.billableRate = params.data.billableRate;
    }
    if (params.data.weeklyCapacity !== undefined) {
      consultant.weeklyCapacity = params.data.weeklyCapacity;
    }
    if (params.data.isActive !== undefined) {
      consultant.isActive = params.data.isActive;
    }
    consultant.updatedAt = now();
    logOperation('consultant', 'update', { id: consultant.id });
    return { ...consultant, skills: [...consultant.skills] };
  }
}

class StaffingAssignmentModel {
  async findMany(params?: {
    where?: { consultantId?: number; projectId?: number; activeOnly?: boolean };
  }): Promise<StaffingAssignment[]> {
    const { consultantId, projectId, activeOnly } = params?.where ?? {};
    const referenceDate = now();
    return state.staffingAssignments
      .filter((assignment) => (consultantId ? assignment.consultantId === consultantId : true))
      .filter((assignment) => (projectId ? assignment.projectId === projectId : true))
      .filter((assignment) => {
        if (!activeOnly) {
          return true;
        }
        return assignment.startDate <= referenceDate && (assignment.endDate === null || assignment.endDate >= referenceDate);
      })
      .map((assignment) => ({ ...assignment }));
  }

  async findUnique(params: { where: { id: number } }): Promise<StaffingAssignment | null> {
    const assignment = state.staffingAssignments.find((item) => item.id === params.where.id);
    return assignment ? { ...assignment } : null;
  }

  async create(params: {
    data: {
      consultantId: number;
      projectId: number;
      startDate: Date;
      endDate?: Date | null;
      allocation: number;
      hoursPerWeek: number;
      billable: boolean;
    };
  }): Promise<StaffingAssignment> {
    const { startDate, endDate } = params.data;
    if (endDate && endDate < startDate) {
      throw new Error('Assignment end date cannot be before start date');
    }
    const timestamp = now();
    const assignment: StaffingAssignment = {
      id: nextId('staffingAssignments'),
      consultantId: params.data.consultantId,
      projectId: params.data.projectId,
      startDate,
      endDate: endDate ?? null,
      allocation: params.data.allocation,
      hoursPerWeek: params.data.hoursPerWeek,
      billable: params.data.billable,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.staffingAssignments.push(assignment);
    logOperation('staffingAssignment', 'create', {
      id: assignment.id,
      projectId: assignment.projectId,
      consultantId: assignment.consultantId,
    });
    return { ...assignment };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<StaffingAssignment, 'startDate' | 'endDate' | 'allocation' | 'hoursPerWeek' | 'billable'>>;
  }): Promise<StaffingAssignment> {
    const assignment = state.staffingAssignments.find((item) => item.id === params.where.id);
    if (!assignment) {
      throw new Error('Staffing assignment not found');
    }
    const nextStart = params.data.startDate ?? assignment.startDate;
    const nextEnd = params.data.endDate ?? assignment.endDate;
    if (nextEnd && nextEnd < nextStart) {
      throw new Error('Assignment end date cannot be before start date');
    }
    if (params.data.startDate !== undefined) {
      assignment.startDate = params.data.startDate;
    }
    if (params.data.endDate !== undefined) {
      assignment.endDate = params.data.endDate;
    }
    if (params.data.allocation !== undefined) {
      assignment.allocation = params.data.allocation;
    }
    if (params.data.hoursPerWeek !== undefined) {
      assignment.hoursPerWeek = params.data.hoursPerWeek;
    }
    if (params.data.billable !== undefined) {
      assignment.billable = params.data.billable;
    }
    assignment.updatedAt = now();
    logOperation('staffingAssignment', 'update', { id: assignment.id });
    return { ...assignment };
  }
}

class ProjectFinancialSettingsModel {
  async findUnique(params: { where: { projectId: number } }): Promise<ProjectFinancialSettings | null> {
    const entry = state.projectFinancialSettings.find((item) => item.projectId === params.where.projectId);
    return entry ? { ...entry } : null;
  }

  async upsert(params: {
    where: { projectId: number };
    create: { billingModel: BillingModel; currency: CurrencyCode; paymentTerms?: string | null; lastUpdatedById: number };
    update: { billingModel?: BillingModel; currency?: CurrencyCode; paymentTerms?: string | null; lastUpdatedById: number };
  }): Promise<ProjectFinancialSettings> {
    const existing = state.projectFinancialSettings.find((item) => item.projectId === params.where.projectId);
    const timestamp = now();
    if (!existing) {
      const created: ProjectFinancialSettings = {
        id: nextId('projectFinancialSettings'),
        projectId: params.where.projectId,
        billingModel: params.create.billingModel,
        currency: params.create.currency,
        paymentTerms: params.create.paymentTerms ?? null,
        lastUpdatedById: params.create.lastUpdatedById,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.projectFinancialSettings.push(created);
      logOperation('projectFinancialSettings', 'create', { projectId: created.projectId });
      return { ...created };
    }
    if (params.update.billingModel !== undefined) {
      existing.billingModel = params.update.billingModel;
    }
    if (params.update.currency !== undefined) {
      existing.currency = params.update.currency;
    }
    if (params.update.paymentTerms !== undefined) {
      existing.paymentTerms = params.update.paymentTerms;
    }
    existing.lastUpdatedById = params.update.lastUpdatedById;
    existing.updatedAt = timestamp;
    logOperation('projectFinancialSettings', 'update', { projectId: existing.projectId });
    return { ...existing };
  }
}

class BillingScheduleItemModel {
  async findMany(params: { where: { projectId?: number } }): Promise<BillingScheduleItem[]> {
    const { projectId } = params.where;
    return state.billingScheduleItems
      .filter((item) => (projectId ? item.projectId === projectId : true))
      .map((item) => ({ ...item }));
  }

  async findUnique(params: { where: { id: number } }): Promise<BillingScheduleItem | null> {
    const item = state.billingScheduleItems.find((entry) => entry.id === params.where.id);
    return item ? { ...item } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      type: BillingModel;
      name: string;
      dueDate: Date;
      amount: number;
      currency: CurrencyCode;
      status?: BillingStatus;
      notes?: string | null;
    };
  }): Promise<BillingScheduleItem> {
    const timestamp = now();
    const item: BillingScheduleItem = {
      id: nextId('billingScheduleItems'),
      projectId: params.data.projectId,
      type: params.data.type,
      name: params.data.name,
      dueDate: params.data.dueDate,
      amount: params.data.amount,
      currency: params.data.currency,
      status: params.data.status ?? 'PLANNED',
      notes: params.data.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.billingScheduleItems.push(item);
    logOperation('billingScheduleItem', 'create', { id: item.id, projectId: item.projectId });
    return { ...item };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<BillingScheduleItem, 'name' | 'dueDate' | 'amount' | 'status' | 'notes' | 'type' | 'currency'>>;
  }): Promise<BillingScheduleItem> {
    const item = state.billingScheduleItems.find((entry) => entry.id === params.where.id);
    if (!item) {
      throw new Error('Billing schedule item not found');
    }
    if (params.data.name !== undefined) {
      item.name = params.data.name;
    }
    if (params.data.dueDate !== undefined) {
      item.dueDate = params.data.dueDate;
    }
    if (params.data.amount !== undefined) {
      item.amount = params.data.amount;
    }
    if (params.data.status !== undefined) {
      item.status = params.data.status;
    }
    if (params.data.notes !== undefined) {
      item.notes = params.data.notes;
    }
    if (params.data.type !== undefined) {
      item.type = params.data.type;
    }
    if (params.data.currency !== undefined) {
      item.currency = params.data.currency;
    }
    item.updatedAt = now();
    logOperation('billingScheduleItem', 'update', { id: item.id });
    return { ...item };
  }
}

class ProjectDocumentModel {
  async findMany(params: {
    where: { projectId?: number; status?: DocumentStatus; category?: DocumentCategory };
  }): Promise<ProjectDocument[]> {
    const { projectId, status, category } = params.where;
    return state.projectDocuments
      .filter((document) => (projectId ? document.projectId === projectId : true))
      .filter((document) => (status ? document.status === status : true))
      .filter((document) => (category ? document.category === category : true))
      .map((document) => ({ ...document, tags: [...document.tags] }));
  }

  async findUnique(params: { where: { id: number } }): Promise<ProjectDocument | null> {
    const document = state.projectDocuments.find((item) => item.id === params.where.id);
    return document ? { ...document, tags: [...document.tags] } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      title: string;
      description?: string | null;
      category: DocumentCategory;
      status?: DocumentStatus;
      tags?: string[];
      createdById: number;
      updatedById?: number;
      currentVersionId?: number | null;
      publishedAt?: Date | null;
    };
  }): Promise<ProjectDocument> {
    const timestamp = now();
    const document: ProjectDocument = {
      id: nextId('projectDocuments'),
      projectId: params.data.projectId,
      title: params.data.title,
      description: params.data.description ?? null,
      category: params.data.category,
      status: params.data.status ?? 'DRAFT',
      tags: [...(params.data.tags ?? [])],
      createdById: params.data.createdById,
      updatedById: params.data.updatedById ?? params.data.createdById,
      currentVersionId: params.data.currentVersionId ?? null,
      publishedAt: params.data.publishedAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.projectDocuments.push(document);
    logOperation('projectDocument', 'create', { id: document.id, projectId: document.projectId });
    return { ...document, tags: [...document.tags] };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Pick<
        ProjectDocument,
        'title' | 'description' | 'category' | 'status' | 'tags' | 'updatedById' | 'currentVersionId' | 'publishedAt'
      >
    >;
  }): Promise<ProjectDocument> {
    const document = state.projectDocuments.find((item) => item.id === params.where.id);
    if (!document) {
      throw new Error('Project document not found');
    }
    if (params.data.title !== undefined) {
      document.title = params.data.title;
    }
    if (params.data.description !== undefined) {
      document.description = params.data.description;
    }
    if (params.data.category !== undefined) {
      document.category = params.data.category;
    }
    if (params.data.status !== undefined) {
      document.status = params.data.status;
    }
    if (params.data.tags !== undefined) {
      document.tags = [...params.data.tags];
    }
    if (params.data.updatedById !== undefined) {
      document.updatedById = params.data.updatedById;
    }
    if (params.data.currentVersionId !== undefined) {
      document.currentVersionId = params.data.currentVersionId;
    }
    if (params.data.publishedAt !== undefined) {
      document.publishedAt = params.data.publishedAt;
    }
    document.updatedAt = now();
    logOperation('projectDocument', 'update', { id: document.id });
    return { ...document, tags: [...document.tags] };
  }
}

class ProjectDocumentVersionModel {
  async findMany(params: { where: { documentId: number } }): Promise<ProjectDocumentVersion[]> {
    return state.projectDocumentVersions
      .filter((version) => version.documentId === params.where.documentId)
      .map((version) => ({ ...version }));
  }

  async findUnique(params: { where: { id: number } }): Promise<ProjectDocumentVersion | null> {
    const version = state.projectDocumentVersions.find((item) => item.id === params.where.id);
    return version ? { ...version } : null;
  }

  async create(params: {
    data: {
      documentId: number;
      fileName: string;
      content: string;
      checksum: string;
      note?: string | null;
      createdById: number;
    };
  }): Promise<ProjectDocumentVersion> {
    const timestamp = now();
    const existingVersions = state.projectDocumentVersions.filter(
      (version) => version.documentId === params.data.documentId
    );
    const nextVersionNumber = existingVersions.reduce((max, version) => Math.max(max, version.version), 0) + 1;
    const version: ProjectDocumentVersion = {
      id: nextId('projectDocumentVersions'),
      documentId: params.data.documentId,
      version: nextVersionNumber,
      fileName: params.data.fileName,
      content: params.data.content,
      checksum: params.data.checksum,
      note: params.data.note ?? null,
      createdById: params.data.createdById,
      createdAt: timestamp,
    };
    state.projectDocumentVersions.push(version);
    logOperation('projectDocumentVersion', 'create', {
      id: version.id,
      documentId: version.documentId,
      version: version.version,
    });
    return { ...version };
  }
}

class TemplateModel {
  async findUnique(params: { where: { id?: number; slug?: string } }): Promise<Template | null> {
    const { id, slug } = params.where;
    const template = state.templates.find(
      (item) => (id ? item.id === id : true) && (slug ? item.slug === slug : true)
    );
    return template
      ? {
          ...template,
          tags: [...template.tags],
          industries: [...template.industries],
        }
      : null;
  }

  async findMany(params?: {
    where?: { kind?: TemplateKind; industries?: string[]; tags?: string[] };
  }): Promise<Template[]> {
    const { where } = params ?? {};
    let templates = [...state.templates];
    if (where?.kind) {
      templates = templates.filter((template) => template.kind === where.kind);
    }
    if (where?.industries && where.industries.length > 0) {
      templates = templates.filter((template) =>
        template.industries.some((industry) => where.industries!.includes(industry))
      );
    }
    if (where?.tags && where.tags.length > 0) {
      templates = templates.filter((template) =>
        template.tags.some((tag) => where.tags!.includes(tag))
      );
    }
    return templates.map((template) => ({
      ...template,
      tags: [...template.tags],
      industries: [...template.industries],
    }));
  }

  async create(params: {
    data: Omit<
      Template,
      'id' | 'createdAt' | 'updatedAt' | 'currentVersionId' | 'currentVersionNumber' | 'usageCount' | 'ratingSum' | 'ratingCount'
    > & {
      createdAt?: Date;
      updatedAt?: Date;
      currentVersionId?: number | null;
      currentVersionNumber?: number | null;
      usageCount?: number;
      ratingSum?: number;
      ratingCount?: number;
    };
  }): Promise<Template> {
    const createdAt = params.data.createdAt ?? now();
    const updatedAt = params.data.updatedAt ?? createdAt;
    const template: Template = {
      id: nextId('templates'),
      name: params.data.name,
      slug: params.data.slug,
      kind: params.data.kind,
      category: params.data.category,
      description: params.data.description ?? null,
      tags: [...params.data.tags],
      industries: [...params.data.industries],
      maturity: params.data.maturity,
      searchVector: params.data.searchVector,
      createdById: params.data.createdById,
      updatedById: params.data.updatedById,
      createdAt,
      updatedAt,
      currentVersionId: params.data.currentVersionId ?? null,
      currentVersionNumber: params.data.currentVersionNumber ?? null,
      usageCount: params.data.usageCount ?? 0,
      ratingSum: params.data.ratingSum ?? 0,
      ratingCount: params.data.ratingCount ?? 0,
    };
    state.templates.push(template);
    logOperation('template', 'create', { id: template.id, slug: template.slug });
    return {
      ...template,
      tags: [...template.tags],
      industries: [...template.industries],
    };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Omit<
        Template,
        'id' | 'createdAt' | 'tags' | 'industries' | 'searchVector' | 'name' | 'slug' | 'kind' | 'category'
      > & {
        tags: string[];
        industries: string[];
        searchVector: string;
        name: string;
        slug: string;
        kind: TemplateKind;
        category: string;
      }
    >;
  }): Promise<Template> {
    const template = state.templates.find((item) => item.id === params.where.id);
    if (!template) {
      throw new Error('Template not found');
    }
    const data = params.data;
    if (data.name !== undefined) {
      template.name = data.name;
    }
    if (data.slug !== undefined) {
      template.slug = data.slug;
    }
    if (data.kind !== undefined) {
      template.kind = data.kind;
    }
    if (data.category !== undefined) {
      template.category = data.category;
    }
    if (data.description !== undefined) {
      template.description = data.description;
    }
    if (data.tags !== undefined) {
      template.tags = [...data.tags];
    }
    if (data.industries !== undefined) {
      template.industries = [...data.industries];
    }
    if (data.maturity !== undefined) {
      template.maturity = data.maturity;
    }
    if (data.searchVector !== undefined) {
      template.searchVector = data.searchVector;
    }
    if (data.updatedById !== undefined) {
      template.updatedById = data.updatedById;
    }
    if (data.currentVersionId !== undefined) {
      template.currentVersionId = data.currentVersionId;
    }
    if (data.currentVersionNumber !== undefined) {
      template.currentVersionNumber = data.currentVersionNumber;
    }
    if (data.usageCount !== undefined) {
      template.usageCount = data.usageCount;
    }
    if (data.ratingSum !== undefined) {
      template.ratingSum = data.ratingSum;
    }
    if (data.ratingCount !== undefined) {
      template.ratingCount = data.ratingCount;
    }
    template.updatedAt = now();
    logOperation('template', 'update', { id: template.id });
    return {
      ...template,
      tags: [...template.tags],
      industries: [...template.industries],
    };
  }
}

class TemplateVersionModel {
  async findMany(params: { where: { templateId: number } }): Promise<TemplateVersion[]> {
    return state.templateVersions
      .filter((version) => version.templateId === params.where.templateId)
      .map((version) => ({
        ...version,
        recommendedRoles: [...version.recommendedRoles],
        deliverables: [...version.deliverables],
      }))
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async findUnique(params: { where: { id: number } }): Promise<TemplateVersion | null> {
    const version = state.templateVersions.find((item) => item.id === params.where.id);
    return version
      ? {
          ...version,
          recommendedRoles: [...version.recommendedRoles],
          deliverables: [...version.deliverables],
        }
      : null;
  }

  async create(params: {
    data: {
      templateId: number;
      versionNumber?: number;
      isMajor: boolean;
      changeLog: string;
      summary: string;
      content: string;
      estimatedEffortHours: number;
      recommendedRoles: string[];
      deliverables: string[];
      maturityFocus: TemplateMaturity;
      createdById: number;
      createdAt?: Date;
    };
  }): Promise<TemplateVersion> {
    const timestamp = params.data.createdAt ?? now();
    const existing = state.templateVersions.filter(
      (version) => version.templateId === params.data.templateId
    );
    const versionNumber =
      params.data.versionNumber ??
      existing.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
    const version: TemplateVersion = {
      id: nextId('templateVersions'),
      templateId: params.data.templateId,
      versionNumber,
      isMajor: params.data.isMajor,
      changeLog: params.data.changeLog,
      summary: params.data.summary,
      content: params.data.content,
      estimatedEffortHours: params.data.estimatedEffortHours,
      recommendedRoles: [...params.data.recommendedRoles],
      deliverables: [...params.data.deliverables],
      maturityFocus: params.data.maturityFocus,
      createdById: params.data.createdById,
      createdAt: timestamp,
    };
    state.templateVersions.push(version);
    logOperation('templateVersion', 'create', {
      id: version.id,
      templateId: version.templateId,
      versionNumber: version.versionNumber,
    });
    return {
      ...version,
      recommendedRoles: [...version.recommendedRoles],
      deliverables: [...version.deliverables],
    };
  }
}

class TemplateUsageModel {
  async findMany(params: { where: { templateId?: number; projectId?: number } }): Promise<TemplateUsage[]> {
    const { templateId, projectId } = params.where;
    return state.templateUsages
      .filter((usage) => (templateId ? usage.templateId === templateId : true))
      .filter((usage) => (projectId ? usage.projectId === projectId : true))
      .map((usage) => ({
        ...usage,
        observedBenefits: [...usage.observedBenefits],
      }));
  }

  async create(params: {
    data: {
      templateId: number;
      projectId: number;
      usedById: number;
      rating?: number | null;
      notes?: string | null;
      observedBenefits?: string[];
      createdAt?: Date;
    };
  }): Promise<TemplateUsage> {
    const usage: TemplateUsage = {
      id: nextId('templateUsages'),
      templateId: params.data.templateId,
      projectId: params.data.projectId,
      usedById: params.data.usedById,
      rating: params.data.rating ?? null,
      notes: params.data.notes ?? null,
      observedBenefits: [...(params.data.observedBenefits ?? [])],
      createdAt: params.data.createdAt ?? now(),
    };
    state.templateUsages.push(usage);
    logOperation('templateUsage', 'create', {
      id: usage.id,
      templateId: usage.templateId,
      projectId: usage.projectId,
    });
    return {
      ...usage,
      observedBenefits: [...usage.observedBenefits],
    };
  }
}

class IntegrationConnectorModel {
  async findMany(params?: {
    where?: { type?: ConnectorType; status?: ConnectorStatus };
  }): Promise<IntegrationConnector[]> {
    const { where } = params ?? {};
    return state.integrationConnectors
      .filter((connector) => (where?.type ? connector.type === where.type : true))
      .filter((connector) => (where?.status ? connector.status === where.status : true))
      .map((connector) => ({
        ...connector,
        capabilities: [...connector.capabilities],
        supportedEntities: [...connector.supportedEntities],
        configuration: { ...connector.configuration },
      }));
  }

  async findUnique(params: { where: { id?: number; key?: string } }): Promise<IntegrationConnector | null> {
    const { id, key } = params.where;
    const connector = state.integrationConnectors.find(
      (item) => (id ? item.id === id : true) && (key ? item.key === key : true)
    );
    return connector
      ? {
          ...connector,
          capabilities: [...connector.capabilities],
          supportedEntities: [...connector.supportedEntities],
          configuration: { ...connector.configuration },
        }
      : null;
  }

  async create(params: {
    data: Omit<IntegrationConnector, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt?: Date;
      updatedAt?: Date;
    };
  }): Promise<IntegrationConnector> {
    const createdAt = params.data.createdAt ?? now();
    const connector: IntegrationConnector = {
      id: nextId('integrationConnectors'),
      key: params.data.key,
      name: params.data.name,
      vendor: params.data.vendor,
      type: params.data.type,
      protocol: params.data.protocol,
      authType: params.data.authType,
      capabilities: [...params.data.capabilities],
      supportedEntities: [...params.data.supportedEntities],
      configuration: { ...params.data.configuration },
      status: params.data.status,
      lastSyncedAt: params.data.lastSyncedAt ?? null,
      createdAt,
      updatedAt: params.data.updatedAt ?? createdAt,
    };
    state.integrationConnectors.push(connector);
    logOperation('integrationConnector', 'create', { id: connector.id, key: connector.key });
    return {
      ...connector,
      capabilities: [...connector.capabilities],
      supportedEntities: [...connector.supportedEntities],
      configuration: { ...connector.configuration },
    };
  }

  async update(params: {
    where: { id: number };
    data: Partial<
      Omit<IntegrationConnector, 'id' | 'createdAt' | 'capabilities' | 'supportedEntities' | 'configuration'> & {
        capabilities: string[];
        supportedEntities: string[];
        configuration: Record<string, unknown>;
      }
    >;
  }): Promise<IntegrationConnector> {
    const connector = state.integrationConnectors.find((item) => item.id === params.where.id);
    if (!connector) {
      throw new Error('Integration connector not found');
    }
    const data = params.data;
    if (data.name !== undefined) {
      connector.name = data.name;
    }
    if (data.key !== undefined) {
      connector.key = data.key;
    }
    if (data.vendor !== undefined) {
      connector.vendor = data.vendor;
    }
    if (data.type !== undefined) {
      connector.type = data.type;
    }
    if (data.protocol !== undefined) {
      connector.protocol = data.protocol;
    }
    if (data.authType !== undefined) {
      connector.authType = data.authType;
    }
    if (data.capabilities !== undefined) {
      connector.capabilities = [...data.capabilities];
    }
    if (data.supportedEntities !== undefined) {
      connector.supportedEntities = [...data.supportedEntities];
    }
    if (data.configuration !== undefined) {
      connector.configuration = { ...data.configuration };
    }
    if (data.status !== undefined) {
      connector.status = data.status;
    }
    if (data.lastSyncedAt !== undefined) {
      connector.lastSyncedAt = data.lastSyncedAt;
    }
    connector.updatedAt = now();
    logOperation('integrationConnector', 'update', { id: connector.id });
    return {
      ...connector,
      capabilities: [...connector.capabilities],
      supportedEntities: [...connector.supportedEntities],
      configuration: { ...connector.configuration },
    };
  }
}

class ConnectorSyncRunModel {
  async findMany(params?: { where?: { connectorId?: number } }): Promise<ConnectorSyncRun[]> {
    const { where } = params ?? {};
    return state.connectorSyncRuns
      .filter((run) => (where?.connectorId ? run.connectorId === where.connectorId : true))
      .map((run) => ({ ...run }));
  }

  async create(params: {
    data: {
      connectorId: number;
      startedAt: Date;
      finishedAt: Date;
      status: SyncStatus;
      recordsPulled: number;
      errorMessage?: string | null;
      datasetId?: number | null;
    };
  }): Promise<ConnectorSyncRun> {
    const run: ConnectorSyncRun = {
      id: nextId('connectorSyncRuns'),
      connectorId: params.data.connectorId,
      startedAt: params.data.startedAt,
      finishedAt: params.data.finishedAt,
      status: params.data.status,
      recordsPulled: params.data.recordsPulled,
      errorMessage: params.data.errorMessage ?? null,
      datasetId: params.data.datasetId ?? null,
    };
    state.connectorSyncRuns.push(run);
    logOperation('connectorSyncRun', 'create', { id: run.id, connectorId: run.connectorId });
    return { ...run };
  }
}

class BiDatasetModel {
  async findMany(params?: { where?: { connectorId?: number; format?: BiDatasetFormat } }): Promise<BiDataset[]> {
    const { where } = params ?? {};
    return state.biDatasets
      .filter((dataset) => (where?.connectorId ? dataset.connectorId === where.connectorId : true))
      .filter((dataset) => (where?.format ? dataset.format === where.format : true))
      .map((dataset) => ({
        ...dataset,
        content: { ...dataset.content },
      }));
  }

  async findUnique(params: { where: { id: number } }): Promise<BiDataset | null> {
    const dataset = state.biDatasets.find((item) => item.id === params.where.id);
    return dataset ? { ...dataset, content: { ...dataset.content } } : null;
  }

  async create(params: {
    data: {
      connectorId: number;
      name: string;
      format: BiDatasetFormat;
      schemaVersion: string;
      content: Record<string, unknown>;
      createdAt?: Date;
    };
  }): Promise<BiDataset> {
    const dataset: BiDataset = {
      id: nextId('biDatasets'),
      connectorId: params.data.connectorId,
      name: params.data.name,
      format: params.data.format,
      schemaVersion: params.data.schemaVersion,
      content: { ...params.data.content },
      createdAt: params.data.createdAt ?? now(),
    };
    state.biDatasets.push(dataset);
    logOperation('biDataset', 'create', { id: dataset.id, connectorId: dataset.connectorId });
    return { ...dataset, content: { ...dataset.content } };
  }
}

class BenchmarkSnapshotModel {
  async findMany(params: {
    where: { projectId: number };
    orderBy?: { generatedAt: 'asc' | 'desc' };
    take?: number;
  }): Promise<BenchmarkSnapshot[]> {
    const { where, orderBy, take } = params;
    let entries = state.benchmarkSnapshots.filter((snapshot) => snapshot.projectId === where.projectId);
    if (orderBy?.generatedAt === 'desc') {
      entries = entries.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    } else if (orderBy?.generatedAt === 'asc') {
      entries = entries.sort((a, b) => a.generatedAt.getTime() - b.generatedAt.getTime());
    }
    if (take !== undefined) {
      entries = entries.slice(0, take);
    }
    return entries.map((entry) => ({
      ...entry,
      metrics: { ...entry.metrics },
      comparisons: { ...entry.comparisons },
      insights: entry.insights.map((insight) => ({ ...insight, tags: [...insight.tags] })),
    }));
  }

  async create(params: {
    data: {
      projectId: number;
      generatedAt?: Date;
      metrics: Record<string, unknown>;
      comparisons: Record<string, unknown>;
      insights: BenchmarkInsightRecord[];
    };
  }): Promise<BenchmarkSnapshot> {
    const snapshot: BenchmarkSnapshot = {
      id: nextId('benchmarkSnapshots'),
      projectId: params.data.projectId,
      generatedAt: params.data.generatedAt ?? now(),
      metrics: { ...params.data.metrics },
      comparisons: { ...params.data.comparisons },
      insights: params.data.insights.map((insight) => ({ ...insight, tags: [...insight.tags] })),
    };
    state.benchmarkSnapshots.push(snapshot);
    logOperation('benchmarkSnapshot', 'create', { id: snapshot.id, projectId: snapshot.projectId });
    return {
      ...snapshot,
      metrics: { ...snapshot.metrics },
      comparisons: { ...snapshot.comparisons },
      insights: snapshot.insights.map((insight) => ({ ...insight, tags: [...insight.tags] })),
    };
  }
}

class BenchmarkFeedbackModel {
  async findMany(params: { where: { projectId: number } }): Promise<BenchmarkFeedback[]> {
    return state.benchmarkFeedback
      .filter((feedback) => feedback.projectId === params.where.projectId)
      .map((feedback) => ({ ...feedback }));
  }

  async create(params: {
    data: { projectId: number; userId: number; usefulness: number; confidence: number; comment?: string | null };
  }): Promise<BenchmarkFeedback> {
    const entry: BenchmarkFeedback = {
      id: nextId('benchmarkFeedback'),
      projectId: params.data.projectId,
      userId: params.data.userId,
      usefulness: params.data.usefulness,
      confidence: params.data.confidence,
      comment: params.data.comment ?? null,
      submittedAt: now(),
    };
    state.benchmarkFeedback.push(entry);
    logOperation('benchmarkFeedback', 'create', { id: entry.id, projectId: entry.projectId });
    return { ...entry };
  }
}

class AuditLogModel {
  async create(params: { data: { userId: number | null; action: string; metadata?: Record<string, unknown> | null } }): Promise<AuditLog> {
    const logEntry: AuditLog = {
      id: nextId('auditLogs'),
      userId: params.data.userId ?? null,
      action: params.data.action,
      metadata: params.data.metadata ?? null,
      createdAt: now(),
    };
    state.auditLogs.push(logEntry);
    logOperation('auditLog', 'create', { id: logEntry.id, action: logEntry.action });
    return { ...logEntry };
  }

  async findMany(params?: { where?: { action?: string } }): Promise<AuditLog[]> {
    const { where } = params ?? {};
    return state.auditLogs
      .filter((log) => (where?.action ? log.action === where.action : true))
      .map((log) => ({ ...log }));
  }
}

class RefreshTokenModel {
  async create(params: { data: { userId: number; token: string } }): Promise<RefreshToken> {
    const tokenHash = bcrypt.hashSync(params.data.token, 10);
    const refreshToken: RefreshToken = {
      id: nextId('refreshTokens'),
      userId: params.data.userId,
      tokenHash,
      createdAt: now(),
      revokedAt: null,
    };
    state.refreshTokens.push(refreshToken);
    logOperation('refreshToken', 'create', { id: refreshToken.id, userId: refreshToken.userId });
    return { ...refreshToken };
  }

  async findFirst(params: { where: { userId: number; token: string } }): Promise<RefreshToken | null> {
    const entry = state.refreshTokens.find((token) => token.userId === params.where.userId && token.revokedAt === null && bcrypt.compareSync(params.where.token, token.tokenHash));
    return entry ? { ...entry } : null;
  }

  async update(params: { where: { id: number }; data: { revokedAt: Date } }): Promise<RefreshToken> {
    const entry = state.refreshTokens.find((token) => token.id === params.where.id);
    if (!entry) {
      throw new Error('Refresh token not found');
    }
    entry.revokedAt = params.data.revokedAt;
    logOperation('refreshToken', 'update', { id: entry.id, revokedAt: entry.revokedAt });
    return { ...entry };
  }

  async deleteMany(params: { where: { userId: number } }): Promise<void> {
    state.refreshTokens = state.refreshTokens.map((token) => (token.userId === params.where.userId ? { ...token, revokedAt: now() } : token));
    logOperation('refreshToken', 'deleteMany', { userId: params.where.userId });
  }
}

export class PrismaClient {
  tenant = new TenantModel();
  tenantArea = new TenantAreaModel();
  contract = new ContractModel();
  user = new UserModel();
  company = new CompanyModel();
  project = new ProjectModel();
  membership = new MembershipModel();
  auditLog = new AuditLogModel();
  refreshToken = new RefreshTokenModel();
  projectCategory = new ProjectCategoryModel();
  projectRisk = new ProjectRiskModel();
  projectChecklist = new ProjectChecklistModel();
  projectKpi = new ProjectKpiModel();
  governanceEvent = new GovernanceEventModel();
  dataRequest = new DataRequestModel();
  dataRequestAttachment = new DataRequestAttachmentModel();
  finding = new FindingModel();
  approval = new ApprovalModel();
  initiative = new InitiativeModel();
  initiativeAssignment = new InitiativeAssignmentModel();
  consultant = new ConsultantModel();
  staffingAssignment = new StaffingAssignmentModel();
  projectFinancialSettings = new ProjectFinancialSettingsModel();
  billingScheduleItem = new BillingScheduleItemModel();
  projectDocument = new ProjectDocumentModel();
  projectDocumentVersion = new ProjectDocumentVersionModel();
  template = new TemplateModel();
  templateVersion = new TemplateVersionModel();
  templateUsage = new TemplateUsageModel();
  integrationConnector = new IntegrationConnectorModel();
  connectorSyncRun = new ConnectorSyncRunModel();
  biDataset = new BiDatasetModel();
  benchmarkSnapshot = new BenchmarkSnapshotModel();
  benchmarkFeedback = new BenchmarkFeedbackModel();

  async $transaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

const prisma = new PrismaClient();

export const resetDatabase = () => resetState();

export default prisma;
