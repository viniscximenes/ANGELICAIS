"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { Comparison } from "../types";

export type UpdateDeflatorTypeInput = {
  id: string;
  displayName: string;
  initialPercent: number;
  incrementPerOccurrence: number;
  autoFromKpiSlug: string | null;
  autoComparison: Comparison | null;
  autoThreshold: number | null;
};

export type UpdateDeflatorTypeResult =
  | { success: true }
  | { success: false; error: string };

export async function updateDeflatorTypeAction(
  input: UpdateDeflatorTypeInput,
): Promise<UpdateDeflatorTypeResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (input.initialPercent < 0 || input.initialPercent > 100) {
    return { success: false, error: "Percentual inicial fora de range (0-100)" };
  }
  if (input.incrementPerOccurrence < 0 || input.incrementPerOccurrence > 100) {
    return { success: false, error: "Incremento fora de range (0-100)" };
  }

  if (input.autoFromKpiSlug !== null) {
    if (!input.autoComparison || input.autoThreshold === null) {
      return {
        success: false,
        error: "Deflator automático precisa de comparação e threshold",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_deflator_types")
    .update({
      display_name: input.displayName.trim(),
      initial_percent: input.initialPercent,
      increment_per_occurrence: input.incrementPerOccurrence,
      auto_from_kpi_slug: input.autoFromKpiSlug,
      auto_comparison: input.autoComparison,
      auto_threshold: input.autoThreshold,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-deflator-type] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
