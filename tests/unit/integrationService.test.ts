import prisma, { User, resetDatabase } from '@/lib/prisma';
import {
  exportBiDatasets,
  listEnterpriseConnectors,
  triggerConnectorSync,
} from '@/services/integrationService';

describe('integrationService', () => {
  let admin: User;

  beforeEach(async () => {
    resetDatabase();
    admin = (await prisma.user.findUnique({ where: { email: 'admin@example.com' } })) as User;
  });

  it('lists seeded connectors with metadata and last runs', async () => {
    const connectors = await listEnterpriseConnectors(admin);
    expect(connectors.length).toBeGreaterThan(0);
    const sapConnector = connectors.find((connector) => connector.key === 'sap-s4hana');
    expect(sapConnector).toBeDefined();
    expect(sapConnector?.capabilities.length).toBeGreaterThan(0);
  });

  it('triggers synchronization and exports datasets in csv format', async () => {
    const result = await triggerConnectorSync('sap-s4hana', { targetFormat: 'TABLEAU' }, admin);
    expect(result.dataset.format).toBe('TABLEAU');
    expect(result.syncRun.recordsPulled).toBeGreaterThan(0);

    const exportResult = await exportBiDatasets({ connectorKey: 'sap-s4hana', format: 'csv' }, admin);
    expect(exportResult.format).toBe('csv');
    expect(typeof exportResult.payload).toBe('string');
    expect((exportResult.payload as string).split('\n')[0]).toBe('name,format,schemaVersion,content');
  });

  it('enforces permissions for client users', async () => {
    const client = await prisma.user.create({
      data: {
        email: 'client@example.com',
        passwordHash: admin.passwordHash,
        role: 'CLIENT',
      },
    });
    await expect(listEnterpriseConnectors(client)).rejects.toThrow('Insufficient permissions');
  });
});
