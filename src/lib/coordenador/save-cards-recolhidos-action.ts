"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type Resultado = { success: true } | { success: false; error: string };

/**
 * Salva quais cards do /c/reports/consolidado o coordenador deixou recolhidos
 * (coordenador_config.cards_recolhidos) — a página reabre do mesmo jeito em
 * qualquer navegador. Sem revalidatePath: o estado já está na tela; isso só
 * persiste pra próxima visita.
 */
export async function saveCardsRecolhidosAction(chaves: string[]): Promise<Resultado> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "view_coordenador_panel")) {
    return { success: false, error: "Sem permissão" };
  }

  const limpas = Array.isArray(chaves)
    ? [...new Set(chaves.filter((c) => typeof c === "string" && /^[a-z0-9-]{1,40}$/.test(c)))].slice(0, 50)
    : [];

  const supabase = await createClient();
  const { error } = await supabase.from("coordenador_config").upsert(
    {
      coordenador_id: user.profile.id,
      cards_recolhidos: limpas,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coordenador_id" },
  );

  if (error) {
    console.error("[saveCardsRecolhidosAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar." };
  }
  return { success: true };
}
