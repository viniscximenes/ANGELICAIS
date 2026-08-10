"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import type { MetaGestorConfig } from "./avaliar-meta-gestor";
import { KPI_GESTOR_CARDS } from "./kpi-gestor-cards-config";

export type SaveKpiGestorMetasResult =
  | { success: true }
  | { success: false; error: string };

const DIRECOES_VALIDAS = new Set(["gte", "lte", "forecast", "diff_bruta"]);

/**
 * Salva as metas do gestor pra /kpi/gestor (gestor_config_fantasia.kpi_gestor_metas).
 */
export async function saveKpiGestorMetasAction(
  metas: Record<string, MetaGestorConfig>,
): Promise<SaveKpiGestorMetasResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (typeof metas !== "object" || metas === null) {
    return { success: false, error: "Metas inválidas" };
  }

  const slugsValidos = new Set(KPI_GESTOR_CARDS.map((c) => c.configSlug));
  const limpo: Record<string, MetaGestorConfig> = {};

  for (const [slug, config] of Object.entries(metas)) {
    if (!slugsValidos.has(slug)) continue;

    const direcao = config?.direcao ?? null;
    if (direcao !== null && !DIRECOES_VALIDAS.has(direcao)) {
      return { success: false, error: `Direção inválida para ${slug}` };
    }

    const meta = config?.meta ?? null;
    if (meta !== null && typeof meta !== "number" && typeof meta !== "string") {
      return { success: false, error: `Meta inválida para ${slug}` };
    }

    limpo[slug] = { meta, direcao };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    { gestor_id: user.profile.id, kpi_gestor_metas: limpo },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveKpiGestorMetasAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  revalidatePath("/kpi/gestor");

  return { success: true };
}
