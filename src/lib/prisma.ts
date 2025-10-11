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
      createdAt: now(),
    };
    state.projectRisks.push(risk);
    logOperation('projectRisk', 'create', { id: risk.id, projectId: risk.projectId });
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

  async $transaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

const prisma = new PrismaClient();

export const resetDatabase = () => resetState();

export default prisma;
