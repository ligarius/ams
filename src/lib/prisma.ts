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
  createdAt: Date;
  updatedAt: Date;
}

interface DatabaseState {
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
  sequences: Record<string, number>;
}

const state: DatabaseState = {
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
  sequences: {},
};

const nextId = (model: keyof DatabaseState['sequences']) => {
  const current = state.sequences[model] ?? 0;
  const next = current + 1;
  state.sequences[model] = next;
  return next;
};

const now = () => new Date();

const seed = () => {
  const adminId = nextId('users');
  const passwordHash = bcrypt.hashSync('Admin123!', 10);
  const timestamp = now();
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

  const companyId = nextId('companies');
  state.companies.push({
    id: companyId,
    name: 'Acme Corp',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  state.auditLogs.push({
    id: nextId('auditLogs'),
    userId: adminId,
    action: 'SEED',
    metadata: { version: 'sprint-1', env: env.NODE_ENV },
    createdAt: timestamp,
  });
};

const resetState = () => {
  state.users = [];
  state.companies = [];
  state.projects = [];
  state.memberships = [];
  state.auditLogs = [];
  state.refreshTokens = [];
  state.projectCategories = [];
  state.projectRisks = [];
  state.projectChecklists = [];
  state.projectKpis = [];
  state.governanceEvents = [];
  state.dataRequests = [];
  state.dataRequestAttachments = [];
  state.findings = [];
  state.approvals = [];
  state.sequences = {};
  seed();
};

resetState();

const logOperation = (model: string, action: string, payload: unknown) => {
  logger.debug({ model, action, payload }, 'db operation');
};

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
    data: Partial<Pick<ProjectRisk, 'title' | 'description' | 'severity' | 'likelihood' | 'status' | 'process' | 'system' | 'dataRequestId'>>;
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

  async findUnique(params: { where: { id: number } }): Promise<Approval | null> {
    const approval = state.approvals.find((item) => item.id === params.where.id);
    return approval ? { ...approval } : null;
  }

  async create(params: {
    data: {
      projectId: number;
      title: string;
      description?: string | null;
      status?: ApprovalStatus;
      createdById: number;
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.approvals.push(approval);
    logOperation('approval', 'create', { id: approval.id, projectId: approval.projectId });
    return { ...approval };
  }

  async update(params: {
    where: { id: number };
    data: Partial<Pick<Approval, 'title' | 'description' | 'status' | 'decidedById' | 'decidedAt'>>;
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
    approval.updatedAt = now();
    logOperation('approval', 'update', { id: approval.id });
    return { ...approval };
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

  async $transaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

const prisma = new PrismaClient();

export const resetDatabase = () => resetState();

export default prisma;
