"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type ToggleShowRvDiarioResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Liga/desliga a coluna "RV Diário" na tabela do Consolidado — persistido
 * por gestor em `gestor_config_fantasia.show_rv_diario` (mesmo padrão de
 * upsert parcial do toggleOlhoAction, uma coluna por vez).
 */
export async function toggleShowRvDiarioAction(
  valor: boolean,
): Promise<ToggleShowRvDiarioResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") return { success: false, error: "Sem permissão" };

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: gestorId, show_rv_diario: valor }, { onConflict: "gestor_id" });

  if (error) {
    console.error("[toggleShowRvDiarioAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar" };
  }

  revalidatePath("/reports/consolidado");

  return { success: true };
}
