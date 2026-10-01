"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { createClient } from "@/lib/supabase/server";

import { PRINCIPAIS_SLUGS, TX_RETENCAO_SLUG } from "./constants";
import { getMetasAnalise } from "./get-metas-analise";
import type { MetaAnaliseKpi } from "./metas-analise";

type SaveResult =
  | { success: true; metas: MetaAnaliseKpi[] }
  | { success: false; error: string };

/** Teto do TMA em segundos (59:59) — a meta é sempre < 1h. */
const TEMPO_MAX_SEGUNDOS = 3599;

/**
 * Salva as metas personalizadas dos KPIs principais de /kpi/evolucao
 * (Tx. Retenção Bruta, TMA, ABS, Indisp Total). `valores` traz TODOS os
 * slugs editados: número = meta personalizada; null = volta ao padrão de
 * kpi_definitions. Não toca em kpi_definitions nem em nenhuma outra tela.
 *
 * Gravação: Tx. Retenção Bruta em analise_meta_tx_retencao (coluna
 * original); os demais em analise_metas_kpi (jsonb slug → número).
 */
export async function saveAnaliseMetasAction(
  valores: Record<string, number | null>,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  const definitions = await getKpiDefinitions();

  let metaTx: number | null = null;
  const outros: Record<string, number> = {};

  for (const slug of PRINCIPAIS_SLUGS) {
    const valor = valores[slug] ?? null;
    if (valor === null) continue;

    const def = definitions.find((d) => d.slug === slug);
    const nome = def?.displayName ?? slug;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
      return { success: false, error: `Meta inválida em ${nome}` };
    }
    if (def?.valueType === "time") {
      if (valor > TEMPO_MAX_SEGUNDOS) {
        return { success: false, error: `${nome}: informe no formato MM:SS` };
      }
    } else if (valor > 100) {
      return { success: false, error: `${nome}: a meta deve estar entre 0 e 100` };
    }

    if (slug === TX_RETENCAO_SLUG) metaTx = valor;
    else outros[slug] = valor;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("gestor_config_fantasia").upsert(
    {
      gestor_id: user.profile.id,
      analise_meta_tx_retencao: metaTx,
      analise_metas_kpi: Object.keys(outros).length > 0 ? outros : null,
    },
    { onConflict: "gestor_id" },
  );

  if (error) {
    console.error("[saveAnaliseMetasAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar as metas." };
  }

  revalidatePath("/s/kpi/evolucao");

  return { success: true, metas: await getMetasAnalise(user.profile.id) };
}
