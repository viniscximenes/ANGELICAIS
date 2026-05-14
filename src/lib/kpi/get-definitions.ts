import { createClient } from "@/lib/supabase/server";

import type { KpiDefinition } from "./types";

export async function getKpiDefinitions(): Promise<KpiDefinition[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_definitions")
    .select(
      `
      id, slug, display_name, group_type, display_order,
      value_type, direction, coloring_type,
      threshold_red, threshold_yellow, threshold_green, threshold_diff_percent,
      meta_column_name, expected_header
    `,
    )
    .order("group_type", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[kpi/get-definitions] erro:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    groupType: row.group_type,
    displayOrder: row.display_order,
    valueType: row.value_type,
    direction: row.direction,
    coloringType: row.coloring_type,
    thresholdRed: row.threshold_red !== null ? Number(row.threshold_red) : null,
    thresholdYellow:
      row.threshold_yellow !== null ? Number(row.threshold_yellow) : null,
    thresholdGreen:
      row.threshold_green !== null ? Number(row.threshold_green) : null,
    thresholdDiffPercent:
      row.threshold_diff_percent !== null
        ? Number(row.threshold_diff_percent)
        : null,
    metaColumnName: row.meta_column_name,
    expectedHeader: row.expected_header,
  }));
}
