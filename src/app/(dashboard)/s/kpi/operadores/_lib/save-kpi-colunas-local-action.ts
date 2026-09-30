"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isKpiColunaSlugLocal } from "./kpi-colunas-local";

type SaveResult = { success: true } | { success: false; error: string };

/**
 * Versão LOCAL de saveKpiColunasAction (lib/kpi/gestor, compartilhado, NÃO
 * alterado) — mesma coluna (gestor_config_fantasia.kpi_colunas_visiveis),
 * mas:
 *  1. valida contra o conjunto estendido de slugs desta rota (inclui os 4
 *     KPIs novos, ver kpi-colunas-local.ts);
 *  2. preserva a ORDEM exatamente como recebida (só remove duplicatas
 *     mantendo a primeira ocorrência — [...new Set(colunas)] já faz isso,
 *     igual à action compartilhada, mas documentado aqui porque é
 *     justamente essa ordem que a spec pede pra tabela seguir).
 * [] continua significando "padrão do site".
 */
export async function saveKpiColunasLocalAction(colunas: string[]): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!Array.isArray(colunas) || colunas.some((c) => typeof c !== "string")) {
    return { success: false, error: "Seleção de colunas inválida." };
  }

  const invalidas = colunas.filter((c) => !isKpiColunaSlugLocal(c));
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
    console.error("[saveKpiColunasLocalAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/s/kpi/operadores");

  return { success: true };
}
