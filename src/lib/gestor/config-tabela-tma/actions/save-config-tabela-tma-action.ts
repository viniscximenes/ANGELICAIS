"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isOrdemTabelaTma, type OrdemTabelaTma } from "../types";

type SaveConfigTabelaTmaResult = { success: true } | { success: false; error: string };

/**
 * Salva a ordenação da tabela do TMA. Mesmo padrão de saveConfigTabelaAction
 * (consolidado) e saveConfigTabelaTempoIndispAction: gate GESTOR, validação
 * no servidor, upsert em gestor_config_fantasia — em coluna própria
 * (ordem_tabela_tma), sem tocar na meta (kpi_gestor_metas.tma, salva por
 * saveTmaMetaAction).
 */
export async function saveConfigTabelaTmaAction(ordemTabela: OrdemTabelaTma): Promise<SaveConfigTabelaTmaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!isOrdemTabelaTma(ordemTabela)) {
    return { success: false, error: "Ordenação inválida." };
  }

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: gestorId,
      ordem_tabela_tma: ordemTabela,
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveConfigTabelaTmaAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/reports/tma-peso");

  return { success: true };
}
