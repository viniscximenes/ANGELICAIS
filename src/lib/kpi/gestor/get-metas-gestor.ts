import { createClient } from "@/lib/supabase/server";
import type {
  KpiColoringType,
  KpiDirection,
  KpiGroupType,
  KpiValueType,
} from "@/lib/kpi/types";

import { getKpiDefinitions } from "../get-definitions";

export type KpiMetaGestor = {
  slug: string;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  thresholdDiffPercent: number | null;
  coloringType: KpiColoringType;
  // from kpi_definitions
  displayName: string;
  valueType: KpiValueType;
  direction: KpiDirection;
  groupType: KpiGroupType;
  displayOrder: number;
};

export async function getMetasGestor(): Promise<KpiMetaGestor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_metas_gestor")
    .select(
      "slug, threshold_red, threshold_yellow, threshold_diff_percent, coloring_type",
    );

  if (error) {
    console.error("[get-metas-gestor] erro:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const definitions = await getKpiDefinitions();
  const defsMap = new Map(definitions.map((d) => [d.slug, d]));

  return data
    .map((row) => {
      const def = defsMap.get(row.slug);
      if (!def) return null;

      return {
        slug: row.slug,
        thresholdRed:
          row.threshold_red !== null ? Number(row.threshold_red) : null,
        thresholdYellow:
          row.threshold_yellow !== null ? Number(row.threshold_yellow) : null,
        thresholdDiffPercent:
          row.threshold_diff_percent !== null
            ? Number(row.threshold_diff_percent)
            : null,
        coloringType: (row.coloring_type ?? "none") as KpiColoringType,
        displayName: def.displayName,
        valueType: def.valueType,
        direction: def.direction,
        groupType: def.groupType,
        displayOrder: def.displayOrder,
      } satisfies KpiMetaGestor;
    })
    .filter((x): x is KpiMetaGestor => x !== null)
    .sort((a, b) => {
      if (a.groupType !== b.groupType) {
        return a.groupType === "principal" ? -1 : 1;
      }
      return a.displayOrder - b.displayOrder;
    });
}
