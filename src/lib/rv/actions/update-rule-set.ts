"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type UpdateRuleSetInput = {
  id: string;
  tetoBase: number;
  multiplicadorMaxPct: number;
};

export type UpdateRuleSetResult =
  | { success: true }
  | { success: false; error: string };

export async function updateRuleSetAction(
  input: UpdateRuleSetInput,
): Promise<UpdateRuleSetResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  if (input.tetoBase < 0 || input.tetoBase > 100000) {
    return { success: false, error: "Teto fora de range válido" };
  }
  if (input.multiplicadorMaxPct < 0 || input.multiplicadorMaxPct > 1000) {
    return { success: false, error: "Multiplicador fora de range válido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rv_rule_sets")
    .update({
      teto_base: input.tetoBase,
      multiplicador_max_pct: input.multiplicadorMaxPct,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("[update-rule-set] erro:", error);
    return { success: false, error: "Falha ao salvar" };
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
