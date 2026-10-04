"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { TEMAS_META, type MetasTemas } from "@/lib/coordenador/types";

type SaveMetaPoloResult = { success: true } | { success: false; error: string };

export async function saveMetaPoloAction(
  metaTxRetencao: number,
  metasTemas: MetasTemas,
): Promise<SaveMetaPoloResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "view_coordenador_panel")) {
    return { success: false, error: "Sem permissão" };
  }

  // Só os temas conhecidos entram no JSON salvo.
  const temas: MetasTemas = {};
  for (const tema of TEMAS_META) {
    if (metasTemas?.[tema] !== undefined) temas[tema] = metasTemas[tema];
  }

  for (const valor of [metaTxRetencao, ...Object.values(temas)]) {
    if (typeof valor !== "number" || Number.isNaN(valor) || valor < 0 || valor > 100) {
      return { success: false, error: "A meta deve ser um valor entre 0 e 100." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coordenador_config").upsert(
    {
      coordenador_id: user.profile.id,
      meta_tx_retencao: metaTxRetencao,
      meta_tx_temas: temas,
      // Mantida em sincronia com o tema financeiro (coluna anterior às metas por tema).
      meta_tx_financeiro: temas["Mot. Financeiro"] ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coordenador_id" },
  );

  if (error) {
    console.error("[saveMetaPoloAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/c/reports/consolidado");
  return { success: true };
}
