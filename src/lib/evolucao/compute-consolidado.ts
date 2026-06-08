import { isStatusInativo } from "@/lib/status/normalize-status";

import type { EvolucaoIndicador, MesBruto } from "./types";

/**
 * Consolidado de um indicador sobre os meses ATIVOS do operador.
 *
 * Meses em que o operador não estava ativo (férias, licença, desligado) são
 * excluídos: seus KPIs ficam distorcidos (TX 0%, pedidos baixos) e contaminam
 * a média/acumulado.
 *
 * - tx_retencao: acumulado real do período — soma(pedidos − churn) /
 *   soma(pedidos). Não é média das TX mensais (média de percentual distorce).
 * - demais: média simples dos valores não-nulos.
 *
 * Função pura — não toca em Supabase.
 */
export function computeConsolidado(
  indicador: EvolucaoIndicador,
  mesesTodos: MesBruto[],
): number | null {
  const meses = mesesTodos.filter((m) => !isStatusInativo(m.status));
  if (meses.length === 0) return null;

  if (indicador === "tx_retencao") {
    // Acumulado real: soma(pedidos - churn) / soma(pedidos)
    let totalRetidos = 0;
    let totalPedidos = 0;
    for (const m of meses) {
      const p = m.pedidos ?? 0;
      const c = m.churn ?? 0;
      totalRetidos += Math.max(p - c, 0);
      totalPedidos += p;
    }
    if (totalPedidos === 0) return null;
    return (totalRetidos / totalPedidos) * 100;
  }

  // Demais: média simples dos valores não-nulos
  const campo: Record<
    Exclude<EvolucaoIndicador, "tx_retencao">,
    keyof MesBruto
  > = {
    pedidos: "pedidos",
    indisponibilidade: "indisp",
    abs: "abs",
    tma: "tma",
  };
  const key = campo[indicador as Exclude<EvolucaoIndicador, "tx_retencao">];
  const valores = meses
    .map((m) => m[key] as number | null)
    .filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}
