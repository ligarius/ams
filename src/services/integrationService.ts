import { z } from 'zod';
import prisma, {
  BiDataset,
  BiDatasetFormat,
  ConnectorSyncRun,
  IntegrationConnector,
  User,
} from '@/lib/prisma';

const syncRequestSchema = z.object({
  targetFormat: z.enum(['POWER_BI', 'TABLEAU']).default('POWER_BI'),
  entities: z.array(z.string().min(2)).max(10).optional(),
  timeframe: z.enum(['LAST_30_DAYS', 'QUARTER_TO_DATE', 'YEAR_TO_DATE']).default('LAST_30_DAYS'),
});

const datasetExportSchema = z.object({
  connectorKey: z.string().trim().min(1).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  biFormat: z.enum(['POWER_BI', 'TABLEAU']).optional(),
});

const assertConnectorPermissions = (actor: User): void => {
  if (!actor) {
    throw new Error('Unauthorized');
  }
  if (actor.role === 'CLIENT') {
    throw new Error('Insufficient permissions');
  }
};

export interface ConnectorOverview {
  id: number;
  key: string;
  name: string;
  vendor: string;
  protocol: IntegrationConnector['protocol'];
  status: IntegrationConnector['status'];
  capabilities: string[];
  supportedEntities: string[];
  lastSyncedAt: string | null;
  lastRun: ConnectorSyncRun | null;
}

export interface TriggerSyncResponse {
  connector: ConnectorOverview;
  dataset: BiDataset;
  syncRun: ConnectorSyncRun;
}

export interface DatasetExportResult {
  connector: Pick<IntegrationConnector, 'id' | 'key' | 'name' | 'type' | 'status'>;
  format: 'json' | 'csv';
  payload: BiDataset[] | string;
}

const serializeConnector = async (connector: IntegrationConnector): Promise<ConnectorOverview> => {
  const runs = await prisma.connectorSyncRun.findMany({ where: { connectorId: connector.id } });
  const lastRun = runs.sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())[0] ?? null;
  return {
    id: connector.id,
    key: connector.key,
    name: connector.name,
    vendor: connector.vendor,
    protocol: connector.protocol,
    status: connector.status,
    capabilities: [...connector.capabilities],
    supportedEntities: [...connector.supportedEntities],
    lastSyncedAt: connector.lastSyncedAt ? connector.lastSyncedAt.toISOString() : null,
    lastRun,
  };
};

export const listEnterpriseConnectors = async (actor: User): Promise<ConnectorOverview[]> => {
  assertConnectorPermissions(actor);
  const connectors = await prisma.integrationConnector.findMany();
  const payload = await Promise.all(connectors.map((connector) => serializeConnector(connector)));
  return payload.sort((a, b) => a.name.localeCompare(b.name));
};

const ensureConnector = async (identifier: number | string): Promise<IntegrationConnector> => {
  if (typeof identifier === 'number') {
    const byId = await prisma.integrationConnector.findUnique({ where: { id: identifier } });
    if (!byId) {
      throw new Error('Connector not found');
    }
    return byId;
  }
  const byKey = await prisma.integrationConnector.findUnique({ where: { key: identifier } });
  if (!byKey) {
    throw new Error('Connector not found');
  }
  return byKey;
};

const buildDatasetContent = (
  connector: IntegrationConnector,
  format: BiDatasetFormat,
  entities: string[] | undefined,
  timeframe: string
) => ({
  generatedAt: new Date().toISOString(),
  connector: connector.key,
  format,
  timeframe,
  entities: entities ?? connector.supportedEntities,
  metrics: {
    recordsPulled: Math.max(500, Math.round(Math.random() * 1500)),
    syncLatencyMinutes: Math.max(2, Math.round(Math.random() * 10)),
    coverage: Math.min(100, 60 + Math.round(Math.random() * 40)),
  },
});

const createDataset = async (
  connector: IntegrationConnector,
  payload: z.infer<typeof syncRequestSchema>
): Promise<BiDataset> => {
  const schemaVersion = `2024.${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  return prisma.biDataset.create({
    data: {
      connectorId: connector.id,
      name: `${connector.name} Operational Snapshot`,
      format: payload.targetFormat,
      schemaVersion,
      content: buildDatasetContent(connector, payload.targetFormat, payload.entities, payload.timeframe),
    },
  });
};

export const triggerConnectorSync = async (
  identifier: number | string,
  payload: unknown,
  actor: User
): Promise<TriggerSyncResponse> => {
  assertConnectorPermissions(actor);
  const connector = await ensureConnector(identifier);
  const data = syncRequestSchema.parse(payload ?? {});
  const dataset = await createDataset(connector, data);
  const now = new Date();
  const startedAt = new Date(now.getTime() - 1000 * 60 * 3);
  const datasetMetrics = (dataset.content as { metrics?: { recordsPulled?: number } }).metrics;
  const recordsPulled = datasetMetrics?.recordsPulled ?? 0;
  const syncRun = await prisma.connectorSyncRun.create({
    data: {
      connectorId: connector.id,
      startedAt,
      finishedAt: now,
      status: 'SUCCESS',
      recordsPulled,
      datasetId: dataset.id,
      errorMessage: null,
    },
  });
  await prisma.integrationConnector.update({
    where: { id: connector.id },
    data: { status: 'CONNECTED', lastSyncedAt: now },
  });
  const overview = await serializeConnector({ ...connector, status: 'CONNECTED', lastSyncedAt: now } as IntegrationConnector);
  return {
    connector: overview,
    dataset,
    syncRun,
  };
};

const convertDatasetsToCsv = (datasets: BiDataset[]): string => {
  const headers = ['name', 'format', 'schemaVersion', 'content'];
  const rows = datasets.map((dataset) => [
    dataset.name.replace(/"/g, '""'),
    dataset.format,
    dataset.schemaVersion,
    JSON.stringify(dataset.content).replace(/"/g, '""'),
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const exportBiDatasets = async (filters: unknown, actor: User): Promise<DatasetExportResult> => {
  assertConnectorPermissions(actor);
  const params = datasetExportSchema.parse(filters ?? {});
  const connector = params.connectorKey
    ? await ensureConnector(params.connectorKey)
    : (await prisma.integrationConnector.findMany())[0];
  if (!connector) {
    throw new Error('Connector not found');
  }
  const datasets = await prisma.biDataset.findMany({
    where: {
      connectorId: connector.id,
      format: params.biFormat ?? undefined,
    },
  });
  if (datasets.length === 0) {
    throw new Error('No datasets available for the requested connector');
  }
  if (params.format === 'csv') {
    return {
      connector: { id: connector.id, key: connector.key, name: connector.name, type: connector.type, status: connector.status },
      format: 'csv',
      payload: convertDatasetsToCsv(datasets),
    };
  }
  return {
    connector: { id: connector.id, key: connector.key, name: connector.name, type: connector.type, status: connector.status },
    format: 'json',
    payload: datasets,
  };
};
