"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type SaveResult = { success: true } | { success: false; error: string };

/**
 * Salva (ou limpa, com `valor: null`) o override de meta de Tx. Retenção
 * Bruta usado SÓ em /operacao/analise-operadores
 * (gestor_config_fantasia.analise_meta_tx_retencao). Não toca em
 * kpi_definitions nem em nada de /kpi/operadores.
 */
export async function saveAnaliseMetaTxRetencaoAction(
  valor: number | null,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (valor !== null) {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      return { success: false, error: "Valor inválido" };
    }
    if (valor < 0 || valor > 100) {
      return { success: false, error: "A meta deve estar entre 0 e 100" };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    { gestor_id: user.profile.id, analise_meta_tx_retencao: valor },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveAnaliseMetaTxRetencaoAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar a meta." };
  }

  revalidatePath("/operacao/analise-operadores");

  return { success: true };
}
