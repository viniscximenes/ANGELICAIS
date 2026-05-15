"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { Comparison } from "../types";

export type UpdateBinaryInput = {
  id: string;
  displayName: string;
  kpiSlug: string;
  comparison: Comparison;
  threshold: number;
  valueIfAchieved: number;
};

export type UpdateBinaryResult =
  | { success: true }
  | { success: false; error: string };

export async function updateBinaryIndicatorAction(
  input: UpdateBinaryInput,
): Promise<UpdateBinaryResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (!input.kpiSlug.trim())
    return { success: false, error: "KPI obrigatório" };
  if (input.valueIfAchieved < 0) {
    return { success: false, error: "Valor não pode ser negativo" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_binary_indicators")
    .update({
      display_name: input.displayName.trim(),
      kpi_slug: input.kpiSlug.trim(),
      comparison: input.comparison,
      threshold: input.threshold,
      value_if_achieved: input.valueIfAchieved,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-binary] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
