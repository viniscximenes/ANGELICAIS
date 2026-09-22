"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type SaveTmaMetaResult = { success: true } | { success: false; error: string };

/**
 * Salva o override de meta do TMA (MM:SS, direção lower_better) pro gestor
 * logado. Grava em gestor_config_fantasia.kpi_gestor_metas.tma — o MESMO
 * campo usado pelo KPI mensal (/kpi/gestor), então o override vale pras duas
 * telas. Faz merge (lê o JSON atual e sobrescreve só a chave "tma") em vez
 * de upsert cego, pra não apagar as metas dos outros KPIs configuradas ali.
 */
export async function saveTmaMetaAction(metaMmSs: string | null): Promise<SaveTmaMetaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") return { success: false, error: "Sem permissão" };

  if (metaMmSs !== null && !/^\d{1,3}:\d{2}$/.test(metaMmSs.trim())) {
    return { success: false, error: "Meta inválida — use o formato MM:SS" };
  }

  const supabase = await createClient();

  const { data: atual, error: erroLeitura } = await supabase
    .from("gestor_config_fantasia")
    .select("kpi_gestor_metas")
    .eq("gestor_id", user.profile.id)
    .maybeSingle();

  if (erroLeitura) {
    console.error("[saveTmaMetaAction] erro ao ler config atual:", erroLeitura.message);
    return { success: false, error: "Erro ao ler configuração atual." };
  }

  const metasAtuais = (atual?.kpi_gestor_metas ?? {}) as Record<string, unknown>;
  const metasAtualizadas = {
    ...metasAtuais,
    tma: { meta: metaMmSs, direcao: "lte" },
  };

  const { error } = await supabase
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: user.profile.id, kpi_gestor_metas: metasAtualizadas }, { onConflict: "gestor_id" });

  if (error) {
    console.error("[saveTmaMetaAction] erro ao salvar:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/reports/tma-peso");
  return { success: true };
}
