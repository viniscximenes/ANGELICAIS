"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isRvColunaId } from "./rv-colunas-config";

type SaveResult = { success: true } | { success: false; error: string };

/**
 * Salva as colunas de RV visíveis (gestor_config_fantasia.kpi_colunas_rv).
 * `colunas === null` grava NULL (== "Restaurar padrão", todas visíveis).
 * `colunas === []` é uma seleção EXPLÍCITA de "nenhuma" (diferente de NULL).
 */
export async function saveKpiColunasRvAction(
  colunas: string[] | null,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (colunas !== null) {
    if (!Array.isArray(colunas) || colunas.some((c) => typeof c !== "string")) {
      return { success: false, error: "Seleção de colunas de RV inválida." };
    }
    const invalidas = colunas.filter((c) => !isRvColunaId(c));
    if (invalidas.length > 0) {
      return { success: false, error: "Seleção de colunas de RV inválida." };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: user.profile.id,
      kpi_colunas_rv: colunas === null ? null : [...new Set(colunas)],
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveKpiColunasRvAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração de RV." };
  }

  revalidatePath("/kpi/operadores");

  return { success: true };
}
