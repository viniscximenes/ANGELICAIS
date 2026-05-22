import { createClient } from "@/lib/supabase/server";

import type { EvolucaoSnapshot } from "./types";

/**
 * Retorna snapshots do dia atual ordenados por report_time crescente.
 * "Dia atual" calculado em timezone America/Sao_Paulo.
 */
export async function getEvolucaoTxHoje(): Promise<EvolucaoSnapshot[]> {
  const supabase = await createClient();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hojeBR = `${map.year}-${map.month}-${map.day}`;

  // Início do dia BR em UTC: BR é UTC-3, então 00:00 BR = 03:00 UTC do mesmo dia
  const startOfDayUtc = `${hojeBR}T03:00:00.000Z`;

  const { data, error } = await supabase
    .from("d1_evolucao_tx")
    .select("id, tx_value, report_time, created_at")
    .gte("created_at", startOfDayUtc)
    .order("report_time", { ascending: true });

  if (error) {
    console.error("[get-evolucao-tx-hoje] erro:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    txValue: Number(r.tx_value),
    reportTime: r.report_time,
    createdAt: r.created_at,
  }));
}
