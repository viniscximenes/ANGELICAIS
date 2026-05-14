export type KpiGroupType = "principal" | "secundario";
export type KpiValueType = "percent" | "number" | "time" | "percent_negative";
export type KpiDirection =
  | "higher_better"
  | "lower_better"
  | "closer_to_zero"
  | "none";
export type KpiColoringType = "three_tier" | "binary" | "none" | "per_row";

export type KpiDefinition = {
  id: string;
  slug: string;
  displayName: string;
  groupType: KpiGroupType;
  displayOrder: number;
  valueType: KpiValueType;
  direction: KpiDirection;
  coloringType: KpiColoringType;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  thresholdGreen: number | null;
  thresholdDiffPercent: number | null;
  metaColumnName: string | null;
  expectedHeader: string;
};

export type KpiDefinitionUpdate = {
  id: string;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  thresholdGreen: number | null;
  thresholdDiffPercent: number | null;
  expectedHeader: string;
};

export type UpdateKpiResult =
  | { success: true }
  | { success: false; error: string };
