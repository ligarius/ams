import { z } from 'zod';
import prisma, { Template, TemplateUsage, TemplateVersion, User } from '@/lib/prisma';
import slugify from '@/utils/slugify';
import { ensureProjectAccess } from '@/services/projectService';

const templateKindSchema = z.enum(['CHECKLIST', 'PLAYBOOK', 'DELIVERABLE', 'RISK_LIBRARY']);
const templateMaturitySchema = z.enum(['FOUNDATIONAL', 'ADVANCED', 'EXPERT']);

const templateCreateSchema = z.object({
  name: z.string().min(5),
  kind: templateKindSchema,
  category: z.string().min(3),
  description: z.string().min(10).max(2000).optional(),
  tags: z.array(z.string().min(2)).min(1),
  industries: z.array(z.string().min(2)).min(1),
  maturity: templateMaturitySchema,
  initialVersion: z.object({
    summary: z.string().min(20),
    content: z.string().min(50),
    changeLog: z.string().min(10),
    estimatedEffortHours: z.number().min(1).max(1000),
    recommendedRoles: z.array(z.string().min(2)).min(1),
    deliverables: z.array(z.string().min(2)).min(1).max(20),
    maturityFocus: templateMaturitySchema.optional(),
  }),
});

const filterArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return undefined;
};

const templateSearchSchema = z.object({
  q: z.string().trim().min(1).optional(),
  kind: templateKindSchema.optional(),
  industries: z
    .custom<unknown>((value) => value)
    .transform((value) => filterArray(value))
    .optional(),
  tags: z
    .custom<unknown>((value) => value)
    .transform((value) => filterArray(value))
    .optional(),
  maturity: templateMaturitySchema.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const templateVersionSchema = z.object({
  summary: z.string().min(20),
  content: z.string().min(50),
  changeLog: z.string().min(5),
  estimatedEffortHours: z.number().min(1).max(1000),
  recommendedRoles: z.array(z.string().min(2)).min(1),
  deliverables: z.array(z.string().min(2)).min(1).max(20),
  maturityFocus: templateMaturitySchema.optional(),
  isMajor: z.boolean().default(true),
});

const templateUsageSchema = z.object({
  projectId: z.number().int().positive(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().min(3).max(1000).optional(),
  observedBenefits: z.array(z.string().min(3)).max(5).optional(),
});

const assertCanCurateTemplates = (actor: User): void => {
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

const buildTemplateSearchVector = (
  template: Pick<Template, 'name' | 'category' | 'description' | 'tags' | 'industries'>,
  summary?: string
): string => {
  const tokens = [
    template.name,
    template.category,
    template.description ?? '',
    ...template.tags,
    ...template.industries,
    summary ?? '',
  ];
  return tokens
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const calculateAverageRating = (template: Template): number | null => {
  if (template.ratingCount === 0) {
    return null;
  }
  return Number((template.ratingSum / template.ratingCount).toFixed(2));
};

const serializeTemplate = async (template: Template) => {
  const currentVersion =
    template.currentVersionId !== null
      ? await prisma.templateVersion.findUnique({ where: { id: template.currentVersionId } })
      : null;
  const averageRating = calculateAverageRating(template);
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    kind: template.kind,
    category: template.category,
    maturity: template.maturity,
    description: template.description,
    tags: [...template.tags],
    industries: [...template.industries],
    usageCount: template.usageCount,
    averageRating,
    currentVersionNumber: template.currentVersionNumber,
    currentVersionSummary: currentVersion?.summary ?? null,
  };
};

export interface TemplateSearchHit extends Awaited<ReturnType<typeof serializeTemplate>> {
  score: number;
  recommendedUseCases: string[];
}

export interface TemplateDetail extends Awaited<ReturnType<typeof serializeTemplate>> {
  versions: TemplateVersion[];
  usageInsights: {
    totalRecords: number;
    recentBenefits: string[];
  };
}

const computeSearchScore = (
  template: Template,
  currentVersion: TemplateVersion | null,
  query?: string,
  tags?: string[],
  industries?: string[]
): number => {
  let score = 10;
  if (query) {
    const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 0);
    const haystack = `${template.searchVector} ${currentVersion?.content?.toLowerCase() ?? ''}`;
    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 6;
      }
      if (template.name.toLowerCase().includes(term)) {
        score += 8;
      }
    }
  }
  if (tags && tags.length > 0) {
    const matches = tags.filter((tag) => template.tags.includes(tag));
    score += matches.length * 5;
  }
  if (industries && industries.length > 0) {
    const matches = industries.filter((industry) => template.industries.includes(industry));
    score += matches.length * 4;
  }
  score += template.usageCount * 0.8;
  const averageRating = calculateAverageRating(template);
  if (averageRating) {
    score += averageRating * 5;
  }
  if (currentVersion?.isMajor) {
    score += 3;
  }
  return Number(score.toFixed(2));
};

const ensureTemplateExists = async (templateId: number): Promise<Template> => {
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) {
    throw new Error('Template not found');
  }
  return template;
};

const loadTemplateDetail = async (templateId: number): Promise<TemplateDetail> => {
  const template = await ensureTemplateExists(templateId);
  const [versions, summary] = await Promise.all([
    prisma.templateVersion.findMany({ where: { templateId } }),
    serializeTemplate(template),
  ]);
  const usage = await prisma.templateUsage.findMany({ where: { templateId } });
  const usageInsights = {
    totalRecords: usage.length,
    recentBenefits: usage
      .slice(-5)
      .flatMap((record) => record.observedBenefits)
      .slice(-5),
  };
  return {
    ...summary,
    versions: versions.sort((a, b) => b.versionNumber - a.versionNumber),
    usageInsights,
  };
};

export const searchTemplates = async (query: unknown, actor: User): Promise<TemplateSearchHit[]> => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  const filters = templateSearchSchema.parse(query ?? {});
  const templates = await prisma.template.findMany({ where: { kind: filters.kind, tags: filters.tags } });
  const results: TemplateSearchHit[] = [];
  for (const template of templates) {
    if (filters.maturity && template.maturity !== filters.maturity) {
      continue;
    }
    if (filters.industries && filters.industries.length > 0) {
      const matchesIndustry = template.industries.some((industry) => filters.industries!.includes(industry));
      if (!matchesIndustry) {
        continue;
      }
    }
    const currentVersion =
      template.currentVersionId !== null
        ? await prisma.templateVersion.findUnique({ where: { id: template.currentVersionId } })
        : null;
    const score = computeSearchScore(template, currentVersion, filters.q, filters.tags, filters.industries);
    const recommendedUseCases = [
      `${template.category} • ${template.maturity}`,
      currentVersion?.summary?.slice(0, 140) ?? template.description ?? '',
    ].filter((item) => item.length > 0);
    results.push({
      ...(await serializeTemplate(template)),
      score,
      recommendedUseCases,
    });
  }
  const limit = filters.limit ?? 20;
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      recommendedUseCases: item.recommendedUseCases.slice(0, 3),
    }));
};

export const createTemplate = async (payload: unknown, actor: User): Promise<TemplateDetail> => {
  assertCanCurateTemplates(actor);
  const data = templateCreateSchema.parse(payload);
  const slug = slugify(data.name);
  const existing = await prisma.template.findMany();
  if (existing.some((template) => template.slug === slug)) {
    throw new Error('Template with the same name already exists');
  }
  const template = await prisma.template.create({
    data: {
      name: data.name,
      slug,
      kind: data.kind,
      category: data.category,
      description: data.description ?? null,
      tags: data.tags,
      industries: data.industries,
      maturity: data.maturity,
      createdById: actor.id,
      updatedById: actor.id,
      searchVector: buildTemplateSearchVector({
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        tags: data.tags,
        industries: data.industries,
      }),
    },
  });

  const version = await prisma.templateVersion.create({
    data: {
      templateId: template.id,
      summary: data.initialVersion.summary,
      content: data.initialVersion.content,
      changeLog: data.initialVersion.changeLog,
      estimatedEffortHours: data.initialVersion.estimatedEffortHours,
      recommendedRoles: data.initialVersion.recommendedRoles,
      deliverables: data.initialVersion.deliverables,
      maturityFocus: data.initialVersion.maturityFocus ?? data.maturity,
      isMajor: true,
      createdById: actor.id,
    },
  });

  await prisma.template.update({
    where: { id: template.id },
    data: {
      currentVersionId: version.id,
      currentVersionNumber: version.versionNumber,
      updatedById: actor.id,
      searchVector: buildTemplateSearchVector(
        {
          name: template.name,
          category: template.category,
          description: template.description,
          tags: template.tags,
          industries: template.industries,
        },
        version.summary
      ),
    },
  });

  return loadTemplateDetail(template.id);
};

export const createTemplateVersion = async (
  templateId: number,
  payload: unknown,
  actor: User
): Promise<TemplateVersion> => {
  assertCanCurateTemplates(actor);
  const template = await ensureTemplateExists(templateId);
  const data = templateVersionSchema.parse(payload);
  const version = await prisma.templateVersion.create({
    data: {
      templateId,
      summary: data.summary,
      content: data.content,
      changeLog: data.changeLog,
      estimatedEffortHours: data.estimatedEffortHours,
      recommendedRoles: data.recommendedRoles,
      deliverables: data.deliverables,
      maturityFocus: data.maturityFocus ?? template.maturity,
      isMajor: data.isMajor,
      createdById: actor.id,
    },
  });
  await prisma.template.update({
    where: { id: templateId },
    data: {
      currentVersionId: version.id,
      currentVersionNumber: version.versionNumber,
      updatedById: actor.id,
      searchVector: buildTemplateSearchVector(
        {
          name: template.name,
          category: template.category,
          description: template.description,
          tags: template.tags,
          industries: template.industries,
        },
        version.summary
      ),
    },
  });
  return version;
};

export const getTemplate = async (templateId: number, actor: User): Promise<TemplateDetail> => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  return loadTemplateDetail(templateId);
};

export const recordTemplateUsage = async (
  templateId: number,
  payload: unknown,
  actor: User
): Promise<TemplateUsage> => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  const template = await ensureTemplateExists(templateId);
  const data = templateUsageSchema.parse(payload);
  await ensureProjectAccess(data.projectId, actor);
  const usage = await prisma.templateUsage.create({
    data: {
      templateId,
      projectId: data.projectId,
      usedById: actor.id,
      rating: data.rating ?? null,
      notes: data.notes ?? null,
      observedBenefits: data.observedBenefits ?? [],
    },
  });
  const nextUsageCount = template.usageCount + 1;
  const ratingSum = template.ratingSum + (data.rating ?? 0);
  const ratingCount = template.ratingCount + (data.rating ? 1 : 0);
  await prisma.template.update({
    where: { id: templateId },
    data: {
      usageCount: nextUsageCount,
      ratingSum,
      ratingCount,
      updatedById: actor.id,
    },
  });
  return usage;
};
