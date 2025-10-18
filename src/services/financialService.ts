import { z } from 'zod';
import prisma, {
  BillingModel,
  BillingScheduleItem,
  BillingStatus,
  CurrencyCode,
  ProjectFinancialSettings,
  User,
} from '@/lib/prisma';
import { ensureProjectAccess } from '@/services/projectService';
import { getProjectStaffingSummary } from '@/services/staffingService';

const BILLING_MODEL_VALUES: BillingModel[] = ['MILESTONE', 'MONTHLY'];
const BILLING_STATUS_VALUES: BillingStatus[] = ['PLANNED', 'INVOICED', 'PAID'];
const CURRENCY_VALUES: CurrencyCode[] = ['USD', 'EUR', 'CLP', 'MXN', 'COP'];

const isoDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' })
  .transform((value) => new Date(value));

const billingConfigSchema = z.object({
  billingModel: z.enum(BILLING_MODEL_VALUES),
  currency: z.enum(CURRENCY_VALUES),
  paymentTerms: z.string().min(1).max(120).optional().nullable(),
});

const billingScheduleSchema = z.object({
  type: z.enum(BILLING_MODEL_VALUES),
  name: z.string().min(3),
  dueDate: isoDateSchema,
  amount: z.number().positive(),
  currency: z.enum(CURRENCY_VALUES),
  status: z.enum(BILLING_STATUS_VALUES).optional(),
  notes: z.string().max(240).optional().nullable(),
});

const billingScheduleUpdateSchema = billingScheduleSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'No fields provided for update',
});

const ensureFinanceAccess = (actor: User) => {
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const ensureFinanceAdmin = (actor: User) => {
  if (actor.role !== 'ADMIN') {
    throw new Error('Insufficient permissions');
  }
};

const formatConfig = (config: ProjectFinancialSettings | null) =>
  config
    ? {
        billingModel: config.billingModel,
        currency: config.currency,
        paymentTerms: config.paymentTerms,
        lastUpdatedById: config.lastUpdatedById,
        updatedAt: config.updatedAt.toISOString(),
      }
    : null;

const sortScheduleItems = (items: BillingScheduleItem[]) =>
  [...items].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

const formatScheduleItem = (item: BillingScheduleItem) => ({
  id: item.id,
  projectId: item.projectId,
  type: item.type,
  name: item.name,
  dueDate: item.dueDate.toISOString(),
  amount: item.amount,
  currency: item.currency,
  status: item.status,
  notes: item.notes,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const summarizeSchedule = (items: BillingScheduleItem[]) =>
  items.reduce(
    (acc, item) => {
      acc.totalAmount += item.amount;
      if (item.status === 'PLANNED') {
        acc.plannedAmount += item.amount;
      } else if (item.status === 'INVOICED') {
        acc.invoicedAmount += item.amount;
      } else if (item.status === 'PAID') {
        acc.paidAmount += item.amount;
      }
      return acc;
    },
    { totalAmount: 0, plannedAmount: 0, invoicedAmount: 0, paidAmount: 0 }
  );

export const getProjectFinancialSummary = async (projectId: number, actor: User) => {
  await ensureProjectAccess(projectId, actor);
  ensureFinanceAccess(actor);
  const [staffing, config, schedule] = await Promise.all([
    getProjectStaffingSummary(projectId, actor),
    prisma.projectFinancialSettings.findUnique({ where: { projectId } }),
    prisma.billingScheduleItem.findMany({ where: { projectId } }),
  ]);
  const orderedSchedule = sortScheduleItems(schedule);
  const scheduleSummary = summarizeSchedule(orderedSchedule);

  return {
    projectId,
    staffing,
    economics: {
      cost: staffing.totals.cost,
      revenue: staffing.totals.revenue,
      margin: staffing.totals.margin,
      marginPercent: staffing.totals.marginPercent,
    },
    billing: {
      config: formatConfig(config),
      schedule: orderedSchedule.map(formatScheduleItem),
      summary: scheduleSummary,
    },
  };
};

export const updateBillingConfig = async (projectId: number, input: unknown, actor: User) => {
  ensureFinanceAdmin(actor);
  const data = billingConfigSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
  const updated = await prisma.projectFinancialSettings.upsert({
    where: { projectId },
    create: {
      billingModel: data.billingModel,
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      lastUpdatedById: actor.id,
    },
    update: {
      billingModel: data.billingModel,
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      lastUpdatedById: actor.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'PROJECT_BILLING_CONFIG_UPDATED',
      metadata: { projectId, billingModel: updated.billingModel },
    },
  });
  return formatConfig(updated);
};

export const listBillingSchedule = async (projectId: number, actor: User) => {
  await ensureProjectAccess(projectId, actor);
  ensureFinanceAccess(actor);
  const [config, schedule] = await Promise.all([
    prisma.projectFinancialSettings.findUnique({ where: { projectId } }),
    prisma.billingScheduleItem.findMany({ where: { projectId } }),
  ]);
  const orderedSchedule = sortScheduleItems(schedule);
  return {
    config: formatConfig(config),
    schedule: orderedSchedule.map(formatScheduleItem),
    summary: summarizeSchedule(orderedSchedule),
  };
};

export const createBillingScheduleItem = async (projectId: number, input: unknown, actor: User) => {
  ensureFinanceAdmin(actor);
  const data = billingScheduleSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }
  const created = await prisma.billingScheduleItem.create({
    data: {
      projectId,
      type: data.type,
      name: data.name,
      dueDate: data.dueDate,
      amount: data.amount,
      currency: data.currency,
      status: data.status ?? 'PLANNED',
      notes: data.notes ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'PROJECT_BILLING_ITEM_CREATED',
      metadata: { projectId, billingItemId: created.id },
    },
  });
  return formatScheduleItem(created);
};

export const updateBillingScheduleItem = async (
  projectId: number,
  itemId: number,
  input: unknown,
  actor: User
) => {
  ensureFinanceAdmin(actor);
  const data = billingScheduleUpdateSchema.parse(input);
  const existing = await prisma.billingScheduleItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.projectId !== projectId) {
    throw new Error('Billing schedule item not found');
  }
  const updated = await prisma.billingScheduleItem.update({
    where: { id: itemId },
    data: {
      ...data,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: 'PROJECT_BILLING_ITEM_UPDATED',
      metadata: { projectId, billingItemId: updated.id },
    },
  });
  return formatScheduleItem(updated);
};

export const exportBillingSchedule = async (projectId: number, actor: User) => {
  await ensureProjectAccess(projectId, actor);
  ensureFinanceAccess(actor);
  const [project, schedule, config] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.billingScheduleItem.findMany({ where: { projectId } }),
    prisma.projectFinancialSettings.findUnique({ where: { projectId } }),
  ]);
  if (!project) {
    throw new Error('Project not found');
  }
  const ordered = sortScheduleItems(schedule);
  const header = 'Project,Billing Item,Type,Due Date,Amount,Currency,Status,Notes,Payment Terms';
  const rows = ordered.map((item) => {
    const cells = [
      project.name,
      item.name,
      item.type,
      item.dueDate.toISOString(),
      item.amount.toFixed(2),
      item.currency,
      item.status,
      item.notes ?? '',
      config?.paymentTerms ?? '',
    ];
    return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });
  return [header, ...rows].join('\n');
};
