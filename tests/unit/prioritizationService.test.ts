import { buildPrioritizationMatrix, riskLevelOrder } from '@/services/prioritizationService';
import type { ProjectRisk } from '@/lib/prisma';

const createRisk = (overrides: Partial<ProjectRisk> & Pick<ProjectRisk, 'id'>): ProjectRisk => ({
  id: overrides.id,
  projectId: overrides.projectId ?? 1,
  categoryId: overrides.categoryId ?? null,
  title: overrides.title ?? `Risk ${overrides.id}`,
  description: overrides.description ?? null,
  severity: overrides.severity ?? 'MEDIUM',
  likelihood: overrides.likelihood ?? 'MEDIUM',
  urgency: overrides.urgency ?? 'MEDIUM',
  complexity: overrides.complexity ?? 'MEDIUM',
  status: overrides.status ?? 'OPEN',
  process: overrides.process ?? null,
  system: overrides.system ?? null,
  dataRequestId: overrides.dataRequestId ?? null,
  createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
});

describe('prioritizationService', () => {
  it('builds a prioritization matrix with deterministic scores and ordering', () => {
    const risks: ProjectRisk[] = [
      createRisk({ id: 1, severity: 'HIGH', urgency: 'MEDIUM', complexity: 'LOW' }),
      createRisk({ id: 2, severity: 'MEDIUM', urgency: 'HIGH', complexity: 'LOW' }),
      createRisk({ id: 3, severity: 'HIGH', urgency: 'LOW', complexity: 'HIGH' }),
    ];

    const matrix = buildPrioritizationMatrix(risks);

    expect(matrix.ordered.map((item) => ({ id: item.id, score: item.score }))).toEqual([
      { id: 1, score: 2.7 },
      { id: 2, score: 2.5 },
      { id: 3, score: 2 },
    ]);

    expect(matrix.matrix.HIGH.MEDIUM.map((item) => item.id)).toEqual([1]);
    expect(matrix.matrix.MEDIUM.HIGH.map((item) => item.id)).toEqual([2]);
    expect(matrix.matrix.HIGH.LOW.map((item) => item.id)).toEqual([3]);
  });

  it('orders risks with identical scores using severity, urgency, complexity and id', () => {
    const risks: ProjectRisk[] = [
      createRisk({ id: 10, severity: 'HIGH', urgency: 'HIGH', complexity: 'LOW', createdAt: new Date('2024-02-01T00:00:00Z') }),
      createRisk({ id: 9, severity: 'HIGH', urgency: 'HIGH', complexity: 'MEDIUM', createdAt: new Date('2024-02-02T00:00:00Z') }),
      createRisk({ id: 11, severity: 'MEDIUM', urgency: 'HIGH', complexity: 'LOW', createdAt: new Date('2024-02-03T00:00:00Z') }),
      createRisk({ id: 8, severity: 'HIGH', urgency: 'HIGH', complexity: 'LOW', createdAt: new Date('2024-02-04T00:00:00Z') }),
    ];

    const matrix = buildPrioritizationMatrix(risks);

    expect(matrix.ordered.map((item) => item.id)).toEqual([8, 10, 9, 11]);
    expect(matrix.matrix.HIGH.HIGH.map((item) => item.id)).toEqual([8, 10, 9]);
    expect(matrix.matrix.MEDIUM.HIGH.map((item) => item.id)).toEqual([11]);
    expect(matrix.matrix.HIGH.HIGH.map((item) => item.score)).toEqual([3, 3, 2.8]);
  });

  it('exposes the risk level order from most to least critical', () => {
    expect(riskLevelOrder).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });
});

