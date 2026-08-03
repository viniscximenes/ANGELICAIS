import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import type { KpiDefinition } from "@/lib/kpi/types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";
import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import { getOperadoresDoGestor } from "./get-operadores-do-gestor";
import type { KpiEquipeGestorData, OperadorKpiEquipe } from "./types";

/**
 * Busca os KPIs de um conjunto fixo de emails num determinado mês.
 *
 * Separado de getKpiEquipeGestor para permitir fixar a composição da equipe
 * pelo mês atual e reusar a mesma lista nos meses anteriores sem refiltrar
 * por meta_gestor. Operadores sem dados no mês aparecem com KPIs vazios (—).
 */
export async function getKpiEquipePorEmails(
  emailsOriginal: string[],
  definitions: KpiDefinition[],
  mesRef: string,
  isMesPassado: boolean,
): Promise<KpiEquipeGestorData> {
  if (emailsOriginal.length === 0) {
    return { operadores: [], mesRef, isMesPassado, dataCorte: null };
  }

  // Candidatos por operador (email + variantes de domínio + alias de KPI +
  // variantes do alias) — consultamos TODOS de uma vez e consolidamos pelo
  // que vier, em vez de tentar adivinhar de antemão qual email "é o certo"
  // pra este mês (ver resolveKpiEmailCandidatesForProfiles).
  const candidatosMap = await resolveKpiEmailCandidatesForProfiles(emailsOriginal);
  const todosCandidatos = [
    ...new Set(
      emailsOriginal.flatMap(
        (e) => candidatosMap.get(e.trim().toLowerCase()) ?? [e.trim().toLowerCase()],
      ),
    ),
  ];

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .in("operator_email", todosCandidatos);

  if (error) {
    console.error("[getKpiEquipePorEmails] erro ao buscar KPIs:", {
      mesRef,
      message: error.message,
      code: error.code,
    });
    // Retornar operadores com KPIs vazios em vez de array vazio — a lista
    // exibida é sempre a equipe fixa, mesmo sem dados neste mês.
  }

  const dataCorte =
    [...(rows ?? [])]
      .map((r) => r.data_corte as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .reverse()[0] ?? null;

  const rowsByEmail = new Map<
    string,
    { kpi_slug: string; valor_numerico: number | null }[]
  >();

  for (const row of rows ?? []) {
    const key = row.operator_email.toLowerCase();
    if (!rowsByEmail.has(key)) rowsByEmail.set(key, []);
    rowsByEmail.get(key)!.push(row);
  }

  const operadores: OperadorKpiEquipe[] = [];

  for (const emailOriginal of emailsOriginal) {
    const emailNorm = emailOriginal.trim().toLowerCase();
    const candidatos = candidatosMap.get(emailNorm) ?? [emailNorm];
    // Consolida linhas de TODOS os candidatos do operador — normalmente só
    // um deles tem dado neste mês específico (o outro pode ter dado em
    // outro mês, ou nenhum).
    const opRows = candidatos.flatMap((c) => rowsByEmail.get(c) ?? []);
    // Só informativo (não consumido fora deste módulo): qual candidato de
    // fato tinha dado neste mês.
    const emailKpi = candidatos.find((c) => (rowsByEmail.get(c)?.length ?? 0) > 0) ?? emailNorm;

    const valuesBySlug = new Map<string, number | null>();
    for (const row of opRows) {
      if (row.valor_numerico !== null) {
        valuesBySlug.set(row.kpi_slug, Number(row.valor_numerico));
      }
    }

    const kpisPrincipal = new Map<string, EnrichedKpiValue | NeutralKpiValue>();
    const kpisSecundario = new Map<string, EnrichedKpiValue | NeutralKpiValue>();

    if (isMesPassado) {
      for (const def of definitions) {
        const entry = {
          definition: def,
          valor: valuesBySlug.get(def.slug) ?? null,
        } satisfies NeutralKpiValue;
        if (def.groupType === "principal") kpisPrincipal.set(def.slug, entry);
        else if (def.groupType === "secundario") kpisSecundario.set(def.slug, entry);
      }
    } else {
      const extra = {
        forecastPedidos: valuesBySlug.get("forecast_pedidos") ?? null,
        forecastChurn: valuesBySlug.get("forecast_churn") ?? null,
        txRetencaoBruta: valuesBySlug.get("tx_retencao_bruta") ?? null,
      };
      const enrichedPrincipal = enrichWithDefinitions(
        definitions,
        valuesBySlug,
        extra,
        "principal",
      );
      const enrichedSecundario = enrichWithDefinitions(
        definitions,
        valuesBySlug,
        extra,
        "secundario",
      );
      for (const [slug, val] of enrichedPrincipal) kpisPrincipal.set(slug, val);
      for (const [slug, val] of enrichedSecundario) kpisSecundario.set(slug, val);
    }

    operadores.push({
      email: emailOriginal,
      emailKpi,
      nome: deriveNomeOperador(emailOriginal),
      kpisPrincipal,
      kpisSecundario,
    });
  }

  operadores.sort((a, b) => a.nome.localeCompare(b.nome));

  return { operadores, mesRef, isMesPassado, dataCorte };
}

/**
 * Wrapper de conveniência: resolve a equipe do gestor no mês dado e chama
 * getKpiEquipePorEmails. Usado pelo quartil (que opera só no mês atual).
 */
export async function getKpiEquipeGestor(
  fullName: string,
  mesRef: string,
  isMesPassado: boolean,
): Promise<KpiEquipeGestorData> {
  const [emailsOriginal, definitions] = await Promise.all([
    getOperadoresDoGestor(fullName, mesRef),
    getKpiDefinitions(),
  ]);
  return getKpiEquipePorEmails(emailsOriginal, definitions, mesRef, isMesPassado);
}
