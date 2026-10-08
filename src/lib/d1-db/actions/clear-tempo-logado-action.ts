"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "../parse";

type ClearTempoLogadoResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Limpa Tempo Logado + Indisponibilidade de HOJE (data_ref) — todas as
 * equipes, já que a base é única/compartilhada (mesmo comportamento do
 * Limpar Base do Consolidado).
 */
export async function clearTempoLogadoAction(): Promise<ClearTempoLogadoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const admin = createAdminClient();
    const dataRef = dataRefHojeBR();

    // Limpa as duas tabelas numa transação só (função
    // limpar_base_tempo_logado, scripts/sql/upload-tempo-logado-atomico.sql)
    // — mesmo padrão do clear do Consolidado. Antes eram dois deletes
    // separados e uma falha no segundo deixava a indisponibilidade com a
    // base velha. Usa o mesmo lock do upload: não corre junto com um upload
    // em andamento.
    const { error } = await admin.rpc("limpar_base_tempo_logado", { p_data_ref: dataRef });
    if (error) throw new Error(error.message);

    // Sem revalidatePath (mesmo motivo do clear do Consolidado): a tela
    // recarrega tabela e Analítico pelo próprio refetch (handleBaseCleared).
    return { success: true };
  } catch (err) {
    // Erro cru do banco só no log do servidor — mesma mensagem genérica do
    // clear-consolidado-action.
    console.error("[clear-tempo-logado] erro:", err);
    return {
      success: false,
      error: "Não foi possível limpar a base. Tente novamente.",
    };
  }
}
