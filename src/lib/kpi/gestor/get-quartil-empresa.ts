import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { resolveKpiEmailsForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

import {
  computeQuartis,
  getRanqueableSlugs,
} from "./compute-quartis";
import type { QuartilData } from "./compute-quartis";
import { getOperadoresDoGestor } from "./get-operadores-do-gestor";

const PAGE_SIZE = 1000;

type SnapshotRow = {
  operator_email: string;
  kpi_slug: string;
  valor_numerico: number | null;
  data_corte: string | null;
};

/**
 * Busca TODOS os operadores do mês via paginação (teto de 1000 contornado).
 *
 * Filtra só os slugs ranqueáveis para reduzir volume:
 *   ~180 ops × ~12 slugs = ~2160 linhas → 3 páginas de 1000.
 *
 * Alternativa descartada: RPC com RANK()/NTILE() + ORDER BY dinâmico por slug
 * ficaria complexa pela direção variável (higher/lower). A paginação + Node
 * reusa computeQuartis e mantém a lógica de direção em um só lugar.
 */
async function fetchTodasAsLinhasRanqueaveis(
  supabase: SupabaseClient,
  mesRef: string,
  ranqueableSlugs: string[],
): Promise<SnapshotRow[]> {
  const allRows: SnapshotRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("kpi_monthly_snapshots")
      .select("operator_email, kpi_slug, valor_numerico, data_corte")
      .eq("mes_ref", mesRef)
      .in("kpi_slug", ranqueableSlugs)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("[getQuartilEmpresa] erro na página", offset, {
        message: error.message,
        code: error.code,
      });
      break;
    }
    if (!data || data.length === 0) break;

    allRows.push(...(data as SnapshotRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}

/**
 * Quartil empresa: calcula rank e quartil de cada operador da equipe dentro
 * do universo da EMPRESA TODA (todos os operadores do mês).
 *
 * Outros operadores entram no cálculo mas não aparecem na saída — só os da
 * equipe do gestor são retornados.
 */
export async function getQuartilEmpresa(
  fullName: string,
  mesRef: string,
): Promise<QuartilData> {
  const definitions = await getKpiDefinitions();
  const ranqueableSlugs = getRanqueableSlugs(definitions);

  const emailsEquipe = await getOperadoresDoGestor(fullName, mesRef);
  if (emailsEquipe.length === 0) {
    return { operadores: [], mesRef, ranqueableSlugs };
  }

  const supabase = await createClient();

  // Alias resolution e fetch paginado em paralelo (independentes)
  const [aliasMap, allRows] = await Promise.all([
    resolveKpiEmailsForProfiles(emailsEquipe),
    fetchTodasAsLinhasRanqueaveis(supabase, mesRef, ranqueableSlugs),
  ]);

  // Agrupar por email — universo EMPRESA TODA
  const valoresPorEmail = new Map<string, Map<string, number | null>>();

  for (const row of allRows) {
    const email = row.operator_email.toLowerCase();
    if (!valoresPorEmail.has(email)) {
      valoresPorEmail.set(email, new Map());
    }
    if (row.valor_numerico !== null) {
      valoresPorEmail.get(email)!.set(row.kpi_slug, Number(row.valor_numerico));
    }
  }

  const dataCorte =
    [...allRows]
      .map((r) => r.data_corte)
      .filter((v): v is string => Boolean(v))
      .sort()
      .reverse()[0] ?? null;

  // computeQuartis com universo empresa (TODOS os operadores)
  const operadoresParaQuartil = [...valoresPorEmail.entries()].map(
    ([email, valores]) => ({ email, valores }),
  );

  const quartisMap = computeQuartis(operadoresParaQuartil, definitions);

  // Retornar só os operadores DA EQUIPE, com quartil/rank no universo empresa
  const operadores = emailsEquipe
    .map((emailOrig) => {
      const emailKpi = aliasMap.get(emailOrig) ?? emailOrig;
      const valoresEquipe = new Map<string, number | null>(
        ranqueableSlugs.map((s) => [s, valoresPorEmail.get(emailKpi)?.get(s) ?? null]),
      );
      return {
        email: emailOrig,
        nome: deriveNomeOperador(emailOrig),
        valores: valoresEquipe,
        quartis: quartisMap.get(emailKpi) ?? new Map(),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return { operadores, mesRef, ranqueableSlugs, dataCorte };
}
