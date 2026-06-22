"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { UpdateKpiResult } from "@/lib/kpi/types";

export type UpdateMetaGestorInput = {
  slug: string;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  thresholdDiffPercent: number | null;
  coloringType: string;
};

export async function updateMetaGestorAction(
  input: UpdateMetaGestorInput,
): Promise<UpdateKpiResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!can(user.profile.role, "manage_system")) {
    return {
      success: false,
      error: "Sem permissão para editar configurações de KPI",
    };
  }

  if (!input.slug) {
    return { success: false, error: "Slug obrigatório" };
  }

  const validColorings = ["three_tier", "binary", "per_row", "none"];
  if (!validColorings.includes(input.coloringType)) {
    return { success: false, error: "Tipo de coloração inválido" };
  }

  for (const t of [
    input.thresholdRed,
    input.thresholdYellow,
    input.thresholdDiffPercent,
  ]) {
    if (t !== null && (t < -100 || t > 100000)) {
      return {
        success: false,
        error: "Valor de threshold fora do range válido",
      };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase.from("kpi_metas_gestor").upsert(
    {
      slug: input.slug,
      threshold_red: input.thresholdRed,
      threshold_yellow: input.thresholdYellow,
      threshold_diff_percent: input.thresholdDiffPercent,
      coloring_type: input.coloringType,
    },
    { onConflict: "slug" },
  );

  if (error) {
    console.error("[update-meta-gestor] erro:", error);
    return { success: false, error: "Falha ao salvar no banco de dados" };
  }

  revalidatePath("/config/kpi");

  return { success: true };
}
