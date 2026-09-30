"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type SaveMetaPoloResult = { success: true } | { success: false; error: string };

export async function saveMetaPoloAction(
  metaTxRetencao: number,
  metaTxFinanceiro: number,
): Promise<SaveMetaPoloResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "view_coordenador_panel")) {
    return { success: false, error: "Sem permissão" };
  }

  for (const valor of [metaTxRetencao, metaTxFinanceiro]) {
    if (typeof valor !== "number" || Number.isNaN(valor) || valor < 0 || valor > 100) {
      return { success: false, error: "A meta deve ser um valor entre 0 e 100." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coordenador_config").upsert(
    {
      coordenador_id: user.profile.id,
      meta_tx_retencao: metaTxRetencao,
      meta_tx_financeiro: metaTxFinanceiro,
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
