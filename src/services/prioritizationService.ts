import { ProjectRisk, RiskLevel, RiskStatus } from '@/lib/prisma';

const RISK_LEVEL_VALUES: Record<RiskLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const IMPACT_WEIGHT = 0.5;
const URGENCY_WEIGHT = 0.3;
const COMPLEXITY_WEIGHT = 0.2;

const PRIORITY_ORDER: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW'];

const computeComplexityModifier = (level: RiskLevel): number => 4 - RISK_LEVEL_VALUES[level];

const computeScore = (risk: ProjectRisk): number => {
  const impact = RISK_LEVEL_VALUES[risk.severity];
  const urgency = RISK_LEVEL_VALUES[risk.urgency];
  const complexity = computeComplexityModifier(risk.complexity);
  const weighted = IMPACT_WEIGHT * impact + URGENCY_WEIGHT * urgency + COMPLEXITY_WEIGHT * complexity;
  return Number(weighted.toFixed(2));
};

export interface PrioritizedRisk {
  id: number;
  title: string;
  severity: RiskLevel;
  likelihood: RiskLevel;
  urgency: RiskLevel;
  complexity: RiskLevel;
  status: RiskStatus;
  score: number;
}

export type PrioritizationGrid = Record<RiskLevel, Record<RiskLevel, PrioritizedRisk[]>>;

export interface PrioritizationMatrix {
  ordered: PrioritizedRisk[];
  matrix: PrioritizationGrid;
}

const createEmptyGrid = (): PrioritizationGrid => ({
  HIGH: { HIGH: [], MEDIUM: [], LOW: [] },
  MEDIUM: { HIGH: [], MEDIUM: [], LOW: [] },
  LOW: { HIGH: [], MEDIUM: [], LOW: [] },
});

const comparePrioritizedRisks = (a: PrioritizedRisk, b: PrioritizedRisk): number => {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const severityDiff = RISK_LEVEL_VALUES[b.severity] - RISK_LEVEL_VALUES[a.severity];
  if (severityDiff !== 0) {
    return severityDiff;
  }
  const urgencyDiff = RISK_LEVEL_VALUES[b.urgency] - RISK_LEVEL_VALUES[a.urgency];
  if (urgencyDiff !== 0) {
    return urgencyDiff;
  }
  const complexityDiff = RISK_LEVEL_VALUES[a.complexity] - RISK_LEVEL_VALUES[b.complexity];
  if (complexityDiff !== 0) {
    return complexityDiff;
  }
  return a.id - b.id;
};

export const buildPrioritizationMatrix = (risks: ProjectRisk[]): PrioritizationMatrix => {
  const grid = createEmptyGrid();
  const prioritized = risks.map((risk) => {
    const item: PrioritizedRisk = {
      id: risk.id,
      title: risk.title,
      severity: risk.severity,
      likelihood: risk.likelihood,
      urgency: risk.urgency,
      complexity: risk.complexity,
      status: risk.status,
      score: computeScore(risk),
    };
    grid[risk.severity][risk.urgency].push(item);
    return item;
  });

  prioritized.sort(comparePrioritizedRisks);

  for (const impact of PRIORITY_ORDER) {
    for (const urgency of PRIORITY_ORDER) {
      grid[impact][urgency].sort(comparePrioritizedRisks);
    }
  }

  return { ordered: prioritized, matrix: grid };
};

export const riskLevelOrder = PRIORITY_ORDER;
