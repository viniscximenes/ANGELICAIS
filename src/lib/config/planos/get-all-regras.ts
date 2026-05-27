import { createClient } from "@/lib/supabase/server";

import type { RegraDesconto, RegraGrouped } from "./types";

function rowToRegra(row: Record<string, unknown>): RegraDesconto {
  return {
    id: row.id as string,
    temOtt: row.tem_ott as boolean,
    tempoMinMeses: row.tempo_min_meses as number,
    tempoMaxMeses: row.tempo_max_meses as number | null,
    descontoMaxPct: row.desconto_max_pct as number,
    duracaoMeses: row.duracao_meses as number,
    ordem: row.ordem as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllRegras(): Promise<RegraGrouped> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("regras_desconto")
    .select("*")
    .eq("is_active", true)
    .order("tem_ott", { ascending: true })
    .order("tempo_min_meses", { ascending: true })
    .order("ordem", { ascending: true });

  if (error) {
    console.error("[get-all-regras] erro:", error);
    return { semOtt: [], comOtt: [] };
  }

  const regras = (data ?? []).map(rowToRegra);

  return {
    semOtt: regras.filter((r) => !r.temOtt),
    comOtt: regras.filter((r) => r.temOtt),
  };
}
