import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveKpiEmailForProfile } from "@/lib/profile/get-kpi-email-for-profile";
import { isStatusInativo } from "@/lib/status/normalize-status";
import { createClient } from "@/lib/supabase/server";

import { computeConsolidado } from "./compute-consolidado";
import type {
  EvolucaoIndicador,
  EvolucaoOperador,
  MesBruto,
  SerieIndicador,
} from "./types";
import { INDICADOR_CONSOLIDADO } from "./types";

// Ordem fixa dos 5 indicadores do painel.
const INDICADORES: EvolucaoIndicador[] = [
  "tx_retencao",
  "pedidos",
  "indisponibilidade",
  "abs",
  "tma",
];

// Slugs lidos do snapshot. Inclui churn — necessário pro acumulado da TX,
// mesmo não sendo um indicador exibido — e meta_status (texto), pra excluir
// do consolidado os meses em que o operador não estava ativo.
const SLUGS = [
  "tx_retencao_bruta",
  "pedidos",
  "churn",
  "indisp_total",
  "abs",
  "tma",
  "meta_status",
] as const;

// Indicador do painel -> campo de MesBruto usado nos pontos da série.
const INDICADOR_TO_CAMPO: Record<EvolucaoIndicador, keyof MesBruto> = {
  tx_retencao: "txRetencao",
  pedidos: "pedidos",
  indisponibilidade: "indisp",
  abs: "abs",
  tma: "tma",
};

function mesVazio(mesRef: string): MesBruto {
  return {
    mesRef,
    txRetencao: null,
    pedidos: null,
    churn: null,
    indisp: null,
    abs: null,
    tma: null,
    status: null,
  };
}

function buildSeries(
  mesesBrutos: MesBruto[],
): Record<EvolucaoIndicador, SerieIndicador> {
  const series = {} as Record<EvolucaoIndicador, SerieIndicador>;

  for (const ind of INDICADORES) {
    const campo = INDICADOR_TO_CAMPO[ind];
    series[ind] = {
      indicador: ind,
      pontos: mesesBrutos.map((m) => ({
        mesRef: m.mesRef,
        valor: m[campo] as number | null,
        status: m.status,
        statusInativo: isStatusInativo(m.status),
      })),
      consolidado: computeConsolidado(ind, mesesBrutos),
      tipoConsolidado: INDICADOR_CONSOLIDADO[ind],
      mesesConsiderados: mesesBrutos.filter((m) => !isStatusInativo(m.status))
        .length,
    };
  }

  return series;
}

/**
 * Lê todos os meses do operador logado no kpi_monthly_snapshots, monta as
 * séries por indicador (mês -> valor) e calcula o consolidado de cada um.
 *
 * Filtra SEMPRE por operator_email + slugs necessários, então retorna poucas
 * linhas (1 por mês por slug) e não esbarra no teto de 1000 linhas do PostgREST.
 *
 * Retorna null em erro de leitura. Operador sem dados retorna estrutura com
 * meses: [] e séries vazias (pontos [], consolidado null).
 */
export async function getEvolucaoOperador(): Promise<EvolucaoOperador | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const emailResolvido = await resolveKpiEmailForProfile(
    user.profile.emailCorporativo,
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kpi_monthly_snapshots")
    .select("mes_ref, kpi_slug, valor_numerico, valor_texto")
    .eq("operator_email", emailResolvido)
    .in("kpi_slug", SLUGS as unknown as string[])
    .order("mes_ref", { ascending: true });

  if (error) {
    console.error("[get-evolucao-operador] erro:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return {
      operatorEmail: emailResolvido,
      meses: [],
      series: buildSeries([]),
    };
  }

  // Agrupa por mês preservando a ordem asc (a query já vem ordenada).
  const byMonth = new Map<string, MesBruto>();
  for (const row of data) {
    let mes = byMonth.get(row.mes_ref);
    if (!mes) {
      mes = mesVazio(row.mes_ref);
      byMonth.set(row.mes_ref, mes);
    }

    // meta_status é texto (não numérico): guarda o status do mês.
    if (row.kpi_slug === "meta_status") {
      mes.status = row.valor_texto;
      continue;
    }

    const num = row.valor_numerico !== null ? Number(row.valor_numerico) : null;
    switch (row.kpi_slug) {
      case "tx_retencao_bruta":
        mes.txRetencao = num;
        break;
      case "pedidos":
        mes.pedidos = num;
        break;
      case "churn":
        mes.churn = num;
        break;
      case "indisp_total":
        mes.indisp = num;
        break;
      case "abs":
        mes.abs = num;
        break;
      case "tma":
        mes.tma = num;
        break;
    }
  }

  const mesesBrutos = Array.from(byMonth.values()).sort((a, b) =>
    a.mesRef.localeCompare(b.mesRef),
  );

  return {
    operatorEmail: emailResolvido,
    meses: mesesBrutos.map((m) => m.mesRef),
    series: buildSeries(mesesBrutos),
  };
}
