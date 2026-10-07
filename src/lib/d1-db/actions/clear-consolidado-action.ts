"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "../parse";

type ClearConsolidadoResult =
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

    // Limpa as duas bases numa transação só (função limpar_base_consolidado,
    // scripts/sql/upload-consolidado-atomico.sql): d1_consolidado de hoje
    // (EquipeTable) e retencao_atendimentos inteira (Analítico — guarda só o
    // último lote, então "tudo" = "o lote do dia"). Antes eram dois deletes
    // separados e uma falha no segundo deixava o Analítico com a base velha.
    // Usa o mesmo lock do upload: não corre junto com um upload em andamento.
    const { error } = await admin.rpc("limpar_base_consolidado", { p_data_ref: dataRef });
    if (error) throw new Error(error.message);

    // Sem revalidatePath: o gestor recarrega tabela e Analítico pelo próprio
    // refetch (handleBaseCleared) e o coordenador chama router.refresh()
    // (ClearBaseButton). Revalidar refazia a página do gestor inteira dentro
    // da resposta, antes do refetch que já ia acontecer.
    return { success: true };
  } catch (err) {
    // Detalhe (mensagem do Postgres/PostgREST) só no log do servidor — o
    // toast do cliente não deve expor nome de tabela/coluna/constraint.
    console.error("[clear-consolidado] erro:", err);
    return {
      success: false,
      error: "Não foi possível limpar a base. Tente novamente.",
    };
  }
}
