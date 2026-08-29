import { createClient } from "@/lib/supabase/server";
import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";

import type { RvCalculation } from "./calc-types";
import { calculateRv } from "./calculate-rv";
import { getAllDeflatorApplicationsForMonth } from "./get-deflator-applications";
import { getFullRuleSet } from "./get-rule-set";
import type { DeflatorApplication, RvScope } from "./types";

/**
 * KPIs neutralizados no modo "Contestação" — forçados ao melhor valor
 * possível (0, já que ambos são "quanto menor, melhor") antes de rodar
 * calculateRv. Não mexe no motor: cobre qualquer mecanismo que hoje ou no
 * futuro referencie esses slugs (elegibilidade, binary, bônus combinado...).
 */
const SLUGS_NEUTRALIZADOS_CONTESTACAO = ["abs", "indisp_total"] as const;

const SEM_DADOS: RvCalculation = {
  status: "sem_dados",
  bruto: 0,
  multiplicadorPedidos: 0,
  subtotal: 0,
  somaDescontosPct: 0,
  liquido: 0,
  tetoBase: 0,
  tetoPossivel: 0,
  valorTravadoImpossivel: 0,
  tieredResults: [],
  binaryResults: [],
  combinedBonusResults: [],
  perUnitResults: [],
  deflatorResults: [],
};

type RvOperadorResultado = {
  normal: RvCalculation;
  contestacao: RvCalculation;
};

export type RvEquipeResultado = {
  /** Chave: email normalizado (trim + lowercase) do parâmetro `emails`. */
  porOperador: Record<string, RvOperadorResultado>;
};

type SnapshotRow = {
  operator_email: string;
  kpi_slug: string;
  valor_numerico: number | null;
  valor_texto: string | null;
};

function buildValuesBySlug(rows: SnapshotRow[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const row of rows) {
    if (row.kpi_slug === "meta_status") continue;
    if (row.valor_numerico !== null) {
      map.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }
  return map;
}

function getOperatorStatus(rows: SnapshotRow[]): string | null {
  const statusRow = rows.find((r) => r.kpi_slug === "meta_status");
  return statusRow?.valor_texto ?? null;
}

/**
 * RV geral (mensal, todas as regras) de uma equipe inteira, nos dois modos
 * — normal e contestação — numa única passada: 1 leitura do rule_set, 1
 * query de snapshots pra equipe toda, 1 query de deflatores do mês.
 *
 * Busca valores BRUTOS de kpi_monthly_snapshots (não reaproveita
 * KpiEquipeSerial, que já vem filtrado pelas colunas configuradas).
 */
export async function getRvParaEquipe(
  emails: string[],
  mesRef: string,
  scope: RvScope,
): Promise<RvEquipeResultado> {
  if (emails.length === 0) return { porOperador: {} };

  const [ruleSet, candidatosMap, todasAplicacoes] = await Promise.all([
    getFullRuleSet(scope),
    resolveKpiEmailCandidatesForProfiles(emails),
    getAllDeflatorApplicationsForMonth(mesRef),
  ]);

  if (!ruleSet) {
    console.error("[getRvParaEquipe] rule set não encontrado:", scope);
    return { porOperador: {} };
  }

  const todosCandidatos = [
    ...new Set(
      emails.flatMap(
        (e) => candidatosMap.get(e.trim().toLowerCase()) ?? [e.trim().toLowerCase()],
      ),
    ),
  ];

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("operator_email, kpi_slug, valor_numerico, valor_texto")
    .eq("mes_ref", mesRef)
    .in("operator_email", todosCandidatos);

  if (error) {
    console.error("[getRvParaEquipe] erro ao buscar snapshots:", error.message);
  }

  const rowsByEmail = new Map<string, SnapshotRow[]>();
  for (const row of rows ?? []) {
    const key = row.operator_email.toLowerCase();
    if (!rowsByEmail.has(key)) rowsByEmail.set(key, []);
    rowsByEmail.get(key)!.push(row);
  }

  const aplicacoesPorEmail = new Map<string, DeflatorApplication[]>();
  for (const app of todasAplicacoes) {
    const key = app.operatorEmail.trim().toLowerCase();
    if (!aplicacoesPorEmail.has(key)) aplicacoesPorEmail.set(key, []);
    aplicacoesPorEmail.get(key)!.push(app);
  }

  const porOperador: RvEquipeResultado["porOperador"] = {};

  for (const emailOriginal of emails) {
    const emailNorm = emailOriginal.trim().toLowerCase();
    const candidatos = candidatosMap.get(emailNorm) ?? [emailNorm];
    // Consolida linhas de todos os candidatos (email + alias de KPI) — só um
    // costuma ter dado neste mês específico.
    const opRows = candidatos.flatMap((c) => rowsByEmail.get(c) ?? []);

    if (opRows.length === 0) {
      porOperador[emailNorm] = { normal: SEM_DADOS, contestacao: SEM_DADOS };
      continue;
    }

    const operatorStatus = getOperatorStatus(opRows);
    const deflatorApps = aplicacoesPorEmail.get(emailNorm) ?? [];

    // Dois Maps independentes — calculateRv escreve de volta no valuesBySlug
    // que recebe (pseudo-KPIs de deflator), então cada chamada usa o seu.
    const valuesNormal = buildValuesBySlug(opRows);
    const valuesContestacao = buildValuesBySlug(opRows);
    for (const slug of SLUGS_NEUTRALIZADOS_CONTESTACAO) {
      valuesContestacao.set(slug, 0);
    }

    const normal = calculateRv(valuesNormal, operatorStatus, ruleSet, deflatorApps);
    const contestacao = calculateRv(valuesContestacao, operatorStatus, ruleSet, deflatorApps);

    porOperador[emailNorm] = { normal, contestacao };
  }

  return { porOperador };
}
