export type RvScope = "current" | "previous";

export type Comparison = "gte" | "lte" | "eq" | "gt" | "lt";

export type Direction = "higher_better" | "lower_better" | "closer_to_zero";

export type RvRuleSet = {
  id: string;
  scope: RvScope;
  tetoBase: number;
  multiplicadorMaxPct: number;
};

export type EligibilityRule = {
  id: string;
  ruleSetId: string;
  displayName: string;
  kpiSlug: string | null;
  comparison: Comparison;
  threshold: number;
  displayOrder: number;
};

export type Faixa = {
  threshold: number;
  value: number;
};

export type TieredIndicator = {
  id: string;
  ruleSetId: string;
  slug: string;
  displayName: string;
  kpiSlug: string;
  direction: Direction;
  faixas: Faixa[];
  requiresIndicatorSlug: string | null;
  requiresThreshold: number | null;
  displayOrder: number;
};

export type BinaryIndicator = {
  id: string;
  ruleSetId: string;
  slug: string;
  displayName: string;
  kpiSlug: string;
  comparison: Comparison;
  threshold: number;
  valueIfAchieved: number;
  displayOrder: number;
};

export type BonusCondition = {
  kpiSlug: string;
  comparison: Comparison;
  threshold: number;
};

export type CombinedBonus = {
  id: string;
  ruleSetId: string;
  displayName: string;
  conditions: BonusCondition[];
  valueIfAllAchieved: number;
  displayOrder: number;
};

export type Multiplier = {
  id: string;
  ruleSetId: string;
  displayName: string;
  kpiSlug: string;
  forecastKpiSlug: string;
  capAt100Pct: boolean;
};

export type DeflatorType = {
  id: string;
  ruleSetId: string;
  displayName: string;
  initialPercent: number;
  incrementPerOccurrence: number;
  autoFromKpiSlug: string | null;
  autoComparison: Comparison | null;
  autoThreshold: number | null;
  displayOrder: number;
  isAuto: boolean;
};

export type DeflatorApplication = {
  id: string;
  operatorEmail: string;
  mesRef: string;
  deflatorTypeId: string;
  occurrenceCount: number;
  notes: string | null;
  appliedBy: string;
  appliedAt: string;
};

/**
 * Conjunto completo de regras de um scope. Estrutura achatada pronta
 * pro algoritmo de cálculo.
 */
export type FullRuleSet = {
  ruleSet: RvRuleSet;
  eligibility: EligibilityRule[];
  tiered: TieredIndicator[];
  binary: BinaryIndicator[];
  combinedBonus: CombinedBonus[];
  multiplier: Multiplier | null;
  deflatorTypes: DeflatorType[];
};
