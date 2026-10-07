"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type ToggleShowRvDiarioResult =
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
  // Server Action é um endpoint público: o tipo do TS não chega em runtime.
  if (typeof valor !== "boolean") return { success: false, error: "Valor inválido" };

  const supabase = await createClient();
  const gestorId = user.profile.id;

  const { error } = await supabase
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: gestorId, show_rv_diario: valor }, { onConflict: "gestor_id" });

  if (error) {
    console.error("[toggleShowRvDiarioAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar" };
  }

  // Sem revalidatePath: o switch já mudou na tela (estado local em
  // GestorEquipeSection). Revalidar refazia a página inteira (~9 consultas)
  // dentro da resposta da action só pra ser descartada.

  return { success: true };
}
