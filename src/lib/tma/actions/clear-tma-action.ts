"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";

type ClearTmaResult = { success: true } | { success: false; error: string };

/**
 * Limpa o TMA de HOJE (data_ref) — todas as equipes, já que a base é
 * única/compartilhada (mesmo comportamento do Limpar Base do Consolidado).
 */
export async function clearTmaAction(): Promise<ClearTmaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para limpar a base" };
  }

  try {
    const admin = createAdminClient();
    const dataRef = dataRefHojeBR();

    // Limpa as duas tabelas numa transação só (função limpar_base_tma,
    // scripts/sql/upload-tma-atomico.sql): d1_tma (tabela) e
    // d1_tma_atendimentos (modal e Analítico) do dia. Antes eram dois
    // deletes separados, só da equipe de quem clicou, e uma falha no segundo
    // deixava o Analítico com a base velha. Usa o mesmo lock do upload: não
    // corre junto com um upload em andamento.
    const { error } = await admin.rpc("limpar_base_tma", { p_data_ref: dataRef });
    if (error) throw new Error(error.message);

    // Sem revalidatePath (mesmo do clearConsolidadoAction): a tela recarrega
    // tabela e Analítico pelo próprio refetch (handleBaseCleared). Revalidar
    // refazia a página inteira dentro da resposta, antes desse refetch.
    return { success: true };
  } catch (err) {
    // Detalhe (mensagem do Postgres/PostgREST) só no log do servidor — o
    // toast do cliente não deve expor nome de tabela/coluna/constraint.
    console.error("[clear-tma] erro:", err);
    return {
      success: false,
      error: "Não foi possível limpar a base. Tente novamente.",
    };
  }
}
