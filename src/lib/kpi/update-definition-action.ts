"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import type { KpiDefinitionUpdate, UpdateKpiResult } from "./types";

export async function updateKpiDefinitionAction(
  update: KpiDefinitionUpdate,
): Promise<UpdateKpiResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_system")) {
    return {
      success: false,
      error: "Sem permissão para editar configurações de KPI",
    };
  }

  if (!update.id) {
    return { success: false, error: "ID do KPI obrigatório" };
  }

  const trimmedHeader = update.expectedHeader.trim();
  if (!trimmedHeader) {
    return { success: false, error: "Cabeçalho esperado não pode ser vazio" };
  }

  for (const t of [
    update.thresholdRed,
    update.thresholdYellow,
    update.thresholdGreen,
    update.thresholdDiffPercent,
  ]) {
    if (t !== null && (t < -100 || t > 100000)) {
      return {
        success: false,
        error: "Valor de threshold fora de range válido",
      };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("kpi_definitions")
    .update({
      threshold_red: update.thresholdRed,
      threshold_yellow: update.thresholdYellow,
      threshold_green: update.thresholdGreen,
      threshold_diff_percent: update.thresholdDiffPercent,
      expected_header: trimmedHeader,
      updated_at: new Date().toISOString(),
    })
    .eq("id", update.id);

  if (error) {
    console.error("[kpi/update-definition] erro:", error);
    return { success: false, error: "Falha ao salvar no banco de dados" };
  }

  revalidatePath("/config/kpi");
  revalidatePath("/bases/kpi");
  revalidatePath("/kpi/painel");

  return { success: true };
}
