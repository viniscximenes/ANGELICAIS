"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isKpiColunaSlug } from "./kpi-colunas-config";

export type SaveKpiColunasResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Salva as colunas de KPI visíveis na tabela de /operacional/kpi
 * (gestor_config_fantasia.kpi_colunas_visiveis — mesma linha do módulo de
 * nome fantasia e da config-tabela do D-1).
 */
export async function saveKpiColunasAction(
  colunas: string[],
): Promise<SaveKpiColunasResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!Array.isArray(colunas) || colunas.some((c) => typeof c !== "string")) {
    return { success: false, error: "Seleção de colunas inválida." };
  }

  const invalidas = colunas.filter((c) => !isKpiColunaSlug(c));
  if (invalidas.length > 0) {
    return { success: false, error: "Seleção de colunas inválida." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: user.profile.id,
      kpi_colunas_visiveis: [...new Set(colunas)],
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveKpiColunasAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/operacional/kpi");
  revalidatePath("/kpi/operadores");

  return { success: true };
}
