"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isOrdemTabelaTempoIndisp, type OrdemTabelaTempoIndisp } from "../types";

type SaveConfigTabelaTempoIndispResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Salva meta de Indisp.% + ordenação da tabela unificada Tempo Logado &
 * Indisponibilidade. Mesmo padrão de saveConfigTabelaAction (consolidado):
 * gate GESTOR, validação no servidor, upsert em gestor_config_fantasia —
 * em colunas próprias (meta_indisponibilidade, ordem_tabela_tempo_indisp),
 * não nas do consolidado.
 */
export async function saveConfigTabelaTempoIndispAction(
  metaIndisponibilidade: number,
  ordemTabela: OrdemTabelaTempoIndisp,
): Promise<SaveConfigTabelaTempoIndispResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (
    typeof metaIndisponibilidade !== "number" ||
    Number.isNaN(metaIndisponibilidade) ||
    metaIndisponibilidade < 0 ||
    metaIndisponibilidade > 100
  ) {
    return { success: false, error: "A meta deve ser um valor entre 0 e 100." };
  }

  if (!isOrdemTabelaTempoIndisp(ordemTabela)) {
    return { success: false, error: "Ordenação inválida." };
  }

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: gestorId,
      meta_indisponibilidade: metaIndisponibilidade,
      ordem_tabela_tempo_indisp: ordemTabela,
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveConfigTabelaTempoIndispAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/reports/tempo-indisponibilidade");

  return { success: true };
}
