"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type TabelaOlho =
  | "consolidado"
  | "tempo_logado"
  | "indisponibilidade"
  | "operacional";

export type ToggleOlhoResult =
  | { success: true }
  | { success: false; error: string };

export async function toggleOlhoAction(
  tabela: TabelaOlho,
  valor: boolean,
): Promise<ToggleOlhoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") return { success: false, error: "Sem permissão" };

  const supabase = await createClient();
  const gestorId = user.profile.id;

  let dbError: { message: string } | null = null;

  if (tabela === "consolidado") {
    const { error } = await supabase
      .from("gestor_config_fantasia")
      .upsert({ gestor_id: gestorId, olho_consolidado: valor }, { onConflict: "gestor_id" });
    dbError = error;
  } else if (tabela === "tempo_logado") {
    const { error } = await supabase
      .from("gestor_config_fantasia")
      .upsert({ gestor_id: gestorId, olho_tempo_logado: valor }, { onConflict: "gestor_id" });
    dbError = error;
  } else if (tabela === "indisponibilidade") {
    const { error } = await supabase
      .from("gestor_config_fantasia")
      .upsert({ gestor_id: gestorId, olho_indisponibilidade: valor }, { onConflict: "gestor_id" });
    dbError = error;
  } else {
    const { error } = await supabase
      .from("gestor_config_fantasia")
      .upsert({ gestor_id: gestorId, olho_operacional: valor }, { onConflict: "gestor_id" });
    dbError = error;
  }

  if (dbError) {
    console.error("[toggleOlhoAction]", dbError);
    return { success: false, error: "Erro ao salvar" };
  }

  return { success: true };
}
