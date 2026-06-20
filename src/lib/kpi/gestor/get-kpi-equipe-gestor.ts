import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";
import { resolveKpiEmailsForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import { getOperadoresDoGestor } from "./get-operadores-do-gestor";
import type { KpiEquipeGestorData, OperadorKpiEquipe } from "./types";

/**
 * Busca os KPIs de toda a equipe do gestor em uma query batch.
 *
 * Abordagem: query única com .in("operator_email", emails) + .eq("mes_ref").
 * 18 ops × 22 slugs = ~396 linhas — bem dentro do teto de 1000 do PostgREST.
 * Não faz N queries individuais.
 *
 * Mês atual: enrich com status/cor (EnrichedKpiValue).
 * Mês passado: modo neutro, sem cor (NeutralKpiValue) — igual ao padrão das
 * páginas de KPI passado existentes.
 */
export async function getKpiEquipeGestor(
  fullName: string,
  mesRef: string,
  grupo: "principal" | "secundario",
  isMesPassado: boolean,
): Promise<KpiEquipeGestorData> {
  // 1. Emails da equipe via matching ILIKE
  const emailsOriginal = await getOperadoresDoGestor(fullName, mesRef);

  if (emailsOriginal.length === 0) {
    return { operadores: [], mesRef, isMesPassado, dataCorte: null };
  }

  // 2. Resolver aliases de email (batch)
  const aliasMap = await resolveKpiEmailsForProfiles(emailsOriginal);
  const emailsResolvidos = [...new Set([...aliasMap.values()])];

  // Mapa inverso kpiEmail → emailOriginal (para reverter depois)
  const kpiToOriginal = new Map<string, string>();
  for (const [orig, kpi] of aliasMap.entries()) {
    if (!kpiToOriginal.has(kpi)) kpiToOriginal.set(kpi, orig);
  }

  // 3. Definições (uma chamada cacheável)
  const definitions = await getKpiDefinitions();

  // 4. Query batch: todos os snapshots dos operadores da equipe no mês
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .in("operator_email", emailsResolvidos);

  if (error) {
    console.error("[getKpiEquipeGestor] erro ao buscar KPIs:", error);
    return { operadores: [], mesRef, isMesPassado, dataCorte: null };
  }

  // Max data_corte do mês — mesmo padrão de get-current-month-snapshot.ts.
  const dataCorte =
    [...(rows ?? [])]
      .map((r) => r.data_corte as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .reverse()[0] ?? null;

  // 5. Agrupar rows por operator_email
  const rowsByEmail = new Map<
    string,
    { kpi_slug: string; valor_numerico: number | null }[]
  >();

  for (const row of rows ?? []) {
    const key = row.operator_email.toLowerCase();
    if (!rowsByEmail.has(key)) rowsByEmail.set(key, []);
    rowsByEmail.get(key)!.push(row);
  }

  // 6. Montar OperadorKpiEquipe para cada operador
  const operadores: OperadorKpiEquipe[] = [];

  for (const emailOriginal of emailsOriginal) {
    const emailKpi = aliasMap.get(emailOriginal) ?? emailOriginal;
    const opRows = rowsByEmail.get(emailKpi) ?? [];

    const valuesBySlug = new Map<string, number | null>();
    for (const row of opRows) {
      if (row.valor_numerico !== null) {
        valuesBySlug.set(row.kpi_slug, Number(row.valor_numerico));
      }
    }

    const kpis = new Map<string, EnrichedKpiValue | NeutralKpiValue>();

    if (isMesPassado) {
      for (const def of definitions) {
        if (def.groupType !== grupo) continue;
        kpis.set(def.slug, {
          definition: def,
          valor: valuesBySlug.get(def.slug) ?? null,
        } satisfies NeutralKpiValue);
      }
    } else {
      const extra = {
        forecastPedidos: valuesBySlug.get("forecast_pedidos") ?? null,
        forecastChurn: valuesBySlug.get("forecast_churn") ?? null,
        txRetencaoBruta: valuesBySlug.get("tx_retencao_bruta") ?? null,
      };
      const enriched = enrichWithDefinitions(
        definitions,
        valuesBySlug,
        extra,
        grupo,
      );
      for (const [slug, val] of enriched) {
        kpis.set(slug, val);
      }
    }

    operadores.push({
      email: emailOriginal,
      emailKpi,
      nome: deriveNomeOperador(emailOriginal),
      kpis,
    });
  }

  operadores.sort((a, b) => a.nome.localeCompare(b.nome));

  return { operadores, mesRef, isMesPassado, dataCorte };
}
