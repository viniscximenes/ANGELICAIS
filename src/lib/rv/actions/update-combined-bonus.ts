"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { BonusCondition } from "../types";

export type UpdateBonusInput = {
  id: string;
  displayName: string;
  conditions: BonusCondition[];
  valueIfAllAchieved: number;
};

export type UpdateBonusResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCombinedBonusAction(
  input: UpdateBonusInput,
): Promise<UpdateBonusResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim())
    return { success: false, error: "Nome obrigatório" };
  if (!Array.isArray(input.conditions) || input.conditions.length === 0) {
    return { success: false, error: "Pelo menos uma condição é obrigatória" };
  }
  if (input.valueIfAllAchieved < 0) {
    return { success: false, error: "Valor não pode ser negativo" };
  }

  for (const c of input.conditions) {
    if (!c.kpiSlug || !c.comparison || typeof c.threshold !== "number") {
      return { success: false, error: "Condição com campos inválidos" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_combined_bonus")
    .update({
      display_name: input.displayName.trim(),
      conditions: input.conditions,
      value_if_all_achieved: input.valueIfAllAchieved,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-combined-bonus] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
