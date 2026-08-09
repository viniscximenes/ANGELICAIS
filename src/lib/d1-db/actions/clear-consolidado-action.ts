"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "../parse";

export type ClearConsolidadoResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Limpa o D-1 Consolidado de HOJE (data_ref) — todas as equipes, já que a
 * base é única/compartilhada (mesmo comportamento do BASE - 1 antigo).
 */
export async function clearConsolidadoAction(): Promise<ClearConsolidadoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const admin = createAdminClient();
    const dataRef = dataRefHojeBR();

    const { error } = await admin.from("d1_consolidado").delete().eq("data_ref", dataRef);
    if (error) throw new Error(error.message);

    // Limpa histórico de evolução do dia (falha silenciosa — complementar).
    try {
      await admin
        .from("d1_evolucao_tx")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.error("[clear-consolidado] erro ao limpar histórico:", e);
    }

    // Limpa a base do Analítico, alimentada pelo MESMO upload do consolidado
    // (uploadConsolidadoAction grava nas duas). Sem isso, /reports/consolidado
    // ficaria vazio e o analítico seguiria mostrando os dados antigos.
    //
    // Apaga tudo (não só data_ref de hoje): salvarBaseRetencao já mantém
    // apenas o último lote, então "tudo" e "o lote do dia" são a mesma coisa.
    // O Supabase client não faz DELETE sem filtro — o neq no id pega todas.
    //
    // Falha aqui não derruba a limpeza do consolidado, que já foi concluída;
    // fica registrada no log.
    const { error: erroRetencao } = await admin
      .from("retencao_atendimentos")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (erroRetencao) {
      console.error(
        "[clear-consolidado] erro ao limpar retencao_atendimentos:",
        erroRetencao.message,
      );
    }

    revalidatePath("/d-1");
    revalidatePath("/gestor/d-1");
    revalidatePath("/reports/consolidado");
    revalidatePath("/reports/consolidado/analitico");
    return { success: true };
  } catch (err) {
    console.error("[clear-consolidado] erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
