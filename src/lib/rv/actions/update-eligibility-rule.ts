"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { Comparison } from "../types";

export type UpdateEligibilityInput = {
  id: string;
  displayName: string;
  kpiSlug: string | null;
  comparison: Comparison;
  threshold: number;
};

export type UpdateEligibilityResult =
  | { success: true }
  | { success: false; error: string };

export async function updateEligibilityRuleAction(
  input: UpdateEligibilityInput,
): Promise<UpdateEligibilityResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (!input.displayName.trim()) {
    return { success: false, error: "Nome obrigatório" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_eligibility_rules")
    .update({
      display_name: input.displayName.trim(),
      kpi_slug: input.kpiSlug,
      comparison: input.comparison,
      threshold: input.threshold,
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-eligibility] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
