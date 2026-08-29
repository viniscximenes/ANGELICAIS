import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeQuartis,
  type OperadorParaQuartil,
} from "@/lib/kpi/gestor/compute-quartis";
import type { KpiDefinition } from "@/lib/kpi/types";

export type QuartilPonto = {
  /** Q1 = melhor desempenho relativo, Q4 = pior — convenção nativa de computeQuartis. */
  quartil: 1 | 2 | 3 | 4;
  rank: number;
  total: number;
};

/** mes_ref → (kpi_slug → quartil do operador selecionado naquele mês). */
type QuartisHistorico = Map<string, Map<string, QuartilPonto>>;

const PAGE_SIZE = 1000;

/**
 * Quartil do operador selecionado, MÊS A MÊS, contra TODOS os operadores da
 * empresa (não só o roster do gestor logado) — escopo "empresa", análogo a
 * src/lib/retencao/escopo.ts.
 *
 * Para cada mes_ref do período: monta o conjunto de todos os operadores com
 * valor não-nulo em cada KPI ranqueável naquele mês e roda a função pura
 * computeQuartis (que já trata direção higher_better/lower_better e nulls,
 * e entrega Q1 = melhor). Só a posição do operador selecionado é retornada
 * — nenhum nome, email ou valor de terceiros sai desta função.
 *
 * Varredura ampla de kpi_monthly_snapshots (pode se aproximar da tabela
 * inteira no período "Todos"), paginada em 1000 como em
 * src/lib/retencao/get-por-operador.ts. Sem RPC/matview — se virar
 * gargalo, é a otimização futura.
 */
export async function getQuartisHistoricoOperador(params: {
  operatorEmailCandidates: string[];
  mesRefInicial: string | null;
  ranqueaveisDefs: KpiDefinition[];
}): Promise<QuartisHistorico> {
  const { operatorEmailCandidates, mesRefInicial, ranqueaveisDefs } = params;
  const resultado: QuartisHistorico = new Map();

  if (ranqueaveisDefs.length === 0 || operatorEmailCandidates.length === 0) {
    return resultado;
  }

  const slugs = ranqueaveisDefs.map((d) => d.slug);
  const candidatosSet = new Set(
    operatorEmailCandidates.map((e) => e.trim().toLowerCase()),
  );

  const supabase = createAdminClient();

  // mes_ref → (operator_email → (slug → valor))
  const porMes = new Map<string, Map<string, Map<string, number | null>>>();

  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("kpi_monthly_snapshots")
      .select("operator_email, mes_ref, kpi_slug, valor_numerico")
      .in("kpi_slug", slugs)
      .range(from, to);

    if (mesRefInicial) {
      query = query.gte("mes_ref", mesRefInicial);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[getQuartisHistoricoOperador] erro:", error.message);
      return resultado;
    }

    const rows = data ?? [];

    for (const row of rows) {
      const mesRef = row.mes_ref as string;
      const email = (row.operator_email as string).trim().toLowerCase();
      if (!porMes.has(mesRef)) porMes.set(mesRef, new Map());
      const porOperador = porMes.get(mesRef)!;
      if (!porOperador.has(email)) porOperador.set(email, new Map());
      const valor =
        row.valor_numerico !== null ? Number(row.valor_numerico) : null;
      porOperador.get(email)!.set(row.kpi_slug as string, valor);
    }

    if (rows.length < PAGE_SIZE) hasMore = false;
    else page++;
  }

  for (const [mesRef, porOperador] of porMes.entries()) {
    const lista: OperadorParaQuartil[] = [];
    for (const [email, valores] of porOperador.entries()) {
      lista.push({ email, valores });
    }

    const quartisDoMes = computeQuartis(lista, ranqueaveisDefs);

    // Localiza o operador selecionado entre os candidatos (num mês só um
    // deles costuma ter dado).
    let quartisOperador: Map<string, QuartilPonto> | undefined;
    for (const [email, mapaSlugs] of quartisDoMes.entries()) {
      if (candidatosSet.has(email) && mapaSlugs.size > 0) {
        quartisOperador = mapaSlugs;
        break;
      }
    }

    if (quartisOperador && quartisOperador.size > 0) {
      resultado.set(mesRef, quartisOperador);
    }
  }

  return resultado;
}
