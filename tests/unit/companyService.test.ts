import { createCompany, listCompanies, updateCompany } from '@/services/companyService';
import prisma, { resetDatabase } from '@/lib/prisma';

describe('companyService', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('lists seeded companies', async () => {
    const companies = await listCompanies();
    expect(companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Acme Corp',
        }),
      ])
    );
  });

  it('creates companies enforcing unique names and logs audit entry', async () => {
    const company = await createCompany({ name: 'Globex Inc' }, 1);
    expect(company.name).toBe('Globex Inc');

    const auditLog = await prisma.auditLog.findMany({ where: { action: 'COMPANY_CREATED' } });
    expect(auditLog.some((entry) => entry.metadata?.companyId === company.id)).toBe(true);

    await expect(createCompany({ name: 'Globex Inc' }, 1)).rejects.toThrow('Company name already exists');
  });

  it('updates company names validating duplicates and logs audit entry', async () => {
    const company = await createCompany({ name: 'Wayne Enterprises' }, 1);

    const updated = await updateCompany(company.id, { name: 'Wayne Corp' }, 1);
    expect(updated.name).toBe('Wayne Corp');

    const auditLog = await prisma.auditLog.findMany({ where: { action: 'COMPANY_UPDATED' } });
    expect(auditLog.some((entry) => entry.metadata?.companyId === company.id)).toBe(true);

    await expect(updateCompany(company.id, { name: 'Acme Corp' }, 1)).rejects.toThrow('Company name already exists');
  });

  it('rejects empty update payloads', async () => {
    const company = await createCompany({ name: 'Stark Industries' }, 1);
    await expect(updateCompany(company.id, {}, 1)).rejects.toThrow('No updates provided');
  });
});
