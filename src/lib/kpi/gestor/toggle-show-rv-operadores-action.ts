"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type ToggleShowRvOperadoresResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Liga/desliga o toggle "Exibir RV" em /kpi/operadores — persistido por
 * gestor em gestor_config_fantasia.show_rv_operadores. Mesmo padrão de
 * upsert parcial do toggleShowRvDiarioAction (Consolidado), coluna própria
 * — não interfere na preferência do RV Diário.
 */
export async function toggleShowRvOperadoresAction(
  valor: boolean,
): Promise<ToggleShowRvOperadoresResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") return { success: false, error: "Sem permissão" };

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: gestorId, show_rv_operadores: valor }, { onConflict: "gestor_id" });

  if (error) {
    console.error("[toggleShowRvOperadoresAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar" };
  }

  revalidatePath("/kpi/operadores");

  return { success: true };
}
