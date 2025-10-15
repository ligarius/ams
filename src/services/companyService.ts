import { z } from 'zod';
import prisma, { Company } from '@/lib/prisma';

const companyNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(120, 'Name must be 120 characters or less');

const createCompanySchema = z.object({
  name: companyNameSchema,
});

const updateCompanySchema = z
  .object({
    name: companyNameSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No updates provided',
        path: ['name'],
      });
    }
  });

export const listCompanies = async (): Promise<Company[]> => {
  const companies = await prisma.company.findMany();
  return companies.map((company) => ({ ...company }));
};

export const createCompany = async (payload: unknown, actorId: number): Promise<Company> => {
  const data = createCompanySchema.parse(payload);
  const normalizedName = data.name.trim();

  const existing = await prisma.company.findUnique({ where: { name: normalizedName } });
  if (existing) {
    throw new Error('Company name already exists');
  }

  const company = await prisma.company.create({ data: { name: normalizedName } });
  await prisma.auditLog.create({
    data: { userId: actorId, action: 'COMPANY_CREATED', metadata: { companyId: company.id } },
  });

  return company;
};

export const updateCompany = async (
  companyId: number,
  payload: unknown,
  actorId: number
): Promise<Company> => {
  const data = updateCompanySchema.parse(payload);
  const normalizedName = data.name!.trim();

  const duplicate = await prisma.company.findUnique({ where: { name: normalizedName } });
  if (duplicate && duplicate.id !== companyId) {
    throw new Error('Company name already exists');
  }

  const updated = await prisma.company.update({ where: { id: companyId }, data: { name: normalizedName } });
  await prisma.auditLog.create({
    data: { userId: actorId, action: 'COMPANY_UPDATED', metadata: { companyId } },
  });

  return updated;
};

export default {
  listCompanies,
  createCompany,
  updateCompany,
};
