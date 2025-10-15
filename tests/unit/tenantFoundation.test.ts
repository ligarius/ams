import prisma, { resetDatabase } from '@/lib/prisma';

describe('tenant foundation models', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('creates tenant, areas and contracts with traceable metadata', async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Beta Consulting',
        slug: 'beta-consulting',
        industry: 'Tecnología',
      },
    });

    expect(tenant).toMatchObject({
      name: 'Beta Consulting',
      slug: 'beta-consulting',
      industry: 'Tecnología',
      status: 'ACTIVE',
    });

    const area = await prisma.tenantArea.create({
      data: {
        tenantId: tenant.id,
        name: 'Operaciones',
        description: 'Equipo responsable de la entrega de auditorías',
      },
    });

    expect(area).toMatchObject({
      tenantId: tenant.id,
      name: 'Operaciones',
      description: 'Equipo responsable de la entrega de auditorías',
      parentAreaId: null,
    });

    const contract = await prisma.contract.create({
      data: {
        tenantId: tenant.id,
        code: 'CNT-2025-001',
        title: 'Contrato Maestro 2025',
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        status: 'ACTIVE',
        value: 150000,
        currency: 'USD',
      },
    });

    expect(contract).toMatchObject({
      tenantId: tenant.id,
      code: 'CNT-2025-001',
      title: 'Contrato Maestro 2025',
      status: 'ACTIVE',
      value: 150000,
      currency: 'USD',
    });

    const [storedTenant] = await prisma.tenant.findMany();
    expect(storedTenant.slug).toBe('acme-consulting');

    const tenantAreas = await prisma.tenantArea.findMany({ where: { tenantId: tenant.id } });
    expect(tenantAreas).toHaveLength(1);
    expect(tenantAreas[0].name).toBe('Operaciones');

    const contracts = await prisma.contract.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' } });
    expect(contracts.map((item) => item.code)).toContain('CNT-2025-001');
  });

  it('updates tenant structures respecting uniqueness constraints', async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Gamma Advisors',
        slug: 'gamma-advisors',
      },
    });

    const contract = await prisma.contract.create({
      data: {
        tenantId: tenant.id,
        code: 'CNT-2025-050',
        title: 'Contrato Inicial',
        startDate: new Date('2025-02-01T00:00:00.000Z'),
      },
    });

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { industry: 'Servicios financieros', status: 'INACTIVE' },
    });
    expect(updatedTenant).toMatchObject({ industry: 'Servicios financieros', status: 'INACTIVE' });

    const updatedArea = await prisma.tenantArea.create({
      data: {
        tenantId: tenant.id,
        name: 'Dirección',
      },
    });

    const refreshedArea = await prisma.tenantArea.update({
      where: { id: updatedArea.id },
      data: { description: 'Board y comité ejecutivo' },
    });
    expect(refreshedArea.description).toBe('Board y comité ejecutivo');

    const refreshedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'CLOSED', endDate: new Date('2025-12-31T00:00:00.000Z') },
    });
    expect(refreshedContract.status).toBe('CLOSED');
    expect(refreshedContract.endDate).not.toBeNull();
  });
});
