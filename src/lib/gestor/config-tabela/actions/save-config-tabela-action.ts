"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import { isOrdemTabela, type OrdemTabela } from "../types";

export type SaveConfigTabelaResult =
  | { success: true }
  | { success: false; error: string };

export async function saveConfigTabelaAction(
  metaTxRetencao: number,
  ordemTabela: OrdemTabela,
): Promise<SaveConfigTabelaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (
    typeof metaTxRetencao !== "number" ||
    Number.isNaN(metaTxRetencao) ||
    metaTxRetencao < 0 ||
    metaTxRetencao > 100
  ) {
    return { success: false, error: "A meta deve ser um valor entre 0 e 100." };
  }

  if (!isOrdemTabela(ordemTabela)) {
    return { success: false, error: "Ordenação inválida." };
  }

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: gestorId,
      meta_tx_retencao: metaTxRetencao,
      ordem_tabela: ordemTabela,
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveConfigTabelaAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/gestor/d-1");
  revalidatePath("/reports/consolidado");

  return { success: true };
}
