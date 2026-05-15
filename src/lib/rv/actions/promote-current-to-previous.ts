"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type PromoteResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Copia tudo do rule_set "current" pra "previous". Apaga as regras
 * antigas de "previous" antes de inserir as novas.
 */
export async function promoteCurrentToPreviousAction(): Promise<PromoteResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system")) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();

  const { data: ruleSets, error: rsError } = await supabase
    .from("rv_rule_sets")
    .select("id, scope, teto_base, multiplicador_max_pct");

  if (rsError || !ruleSets || ruleSets.length !== 2) {
    return { success: false, error: "Erro ao ler rule sets" };
  }

  const current = ruleSets.find((r) => r.scope === "current");
  const previous = ruleSets.find((r) => r.scope === "previous");

  if (!current || !previous) {
    return { success: false, error: "Rule sets não encontrados" };
  }

  const { error: updRs } = await supabase
    .from("rv_rule_sets")
    .update({
      teto_base: current.teto_base,
      multiplicador_max_pct: current.multiplicador_max_pct,
      updated_at: new Date().toISOString(),
    })
    .eq("id", previous.id);

  if (updRs) {
    return { success: false, error: "Erro ao atualizar configurações gerais" };
  }

  const tables = [
    "rv_eligibility_rules",
    "rv_tiered_indicators",
    "rv_binary_indicators",
    "rv_combined_bonus",
    "rv_multiplier",
    "rv_deflator_types",
  ];

  for (const table of tables) {
    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .eq("rule_set_id", previous.id);

    if (delErr) {
      console.error(`[promote] erro delete ${table}:`, delErr);
      return { success: false, error: `Falha ao limpar ${table}` };
    }

    const { data: currentRows, error: readErr } = await supabase
      .from(table)
      .select("*")
      .eq("rule_set_id", current.id);

    if (readErr || !currentRows) {
      return { success: false, error: `Falha ao ler ${table}` };
    }

    if (currentRows.length === 0) continue;

    const rowsToInsert = currentRows.map((row) => {
      const { id: _id, ...rest } = row;
      void _id;
      return { ...rest, rule_set_id: previous.id };
    });

    const { error: insErr } = await supabase.from(table).insert(rowsToInsert);

    if (insErr) {
      console.error(`[promote] erro insert ${table}:`, insErr);
      return { success: false, error: `Falha ao copiar ${table}` };
    }
  }

  revalidatePath("/config/rv");
  revalidatePath("/rv/atual");
  revalidatePath("/rv/passado");
  return { success: true };
}
