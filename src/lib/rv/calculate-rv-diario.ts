import type { OperadorConsolidado } from "@/lib/d1-db/types";

import { findPerUnitFaixa } from "./calculate-rv";
import type { PerUnitFaixa } from "./types";

/**
 * RV Diário de uma pessoa: taxa de retenção do dia identifica a faixa
 * (mesma régua do RV do mês, ver findPerUnitFaixa), multiplicada pelos
 * retidos do dia. null quando não há atendimento no dia (mesma convenção de
 * "—" usada nas outras colunas da tabela pra txRetencao null).
 */
function calcularRvDiario(
  txRetencao: number | null,
  retidos: number,
  faixas: PerUnitFaixa[],
): number | null {
  if (txRetencao === null) return null;

  // faixas.threshold está em escala percentual (ex: 69), txRetencao é fração (0.69).
  const txPercent = txRetencao * 100;
  const faixaAtingida = findPerUnitFaixa(txPercent, faixas);
  const valorPorRetido = faixaAtingida?.value ?? 0;

  return valorPorRetido * retidos;
}

/**
 * Anexa rvDiario a cada operador e soma o total da equipe (não recalcula em
 * cima da tx média do time — soma os valores individuais, já que as faixas
 * são por pessoa). Usado tanto na carga inicial da página quanto no polling
 * (refreshConsolidadoAction), pra não duplicar o cálculo nos dois lugares.
 */
export function aplicarRvDiarioNaEquipe(
  operadores: OperadorConsolidado[],
  faixas: PerUnitFaixa[],
): { operadores: OperadorConsolidado[]; rvDiarioEquipe: number | null } {
  let soma = 0;
  let temAlgum = false;

  const operadoresComRv = operadores.map((op) => {
    const rvDiario = calcularRvDiario(op.txRetencao, op.retidos, faixas);
    if (rvDiario !== null) {
      soma += rvDiario;
      temAlgum = true;
    }
    return { ...op, rvDiario };
  });

  return { operadores: operadoresComRv, rvDiarioEquipe: temAlgum ? soma : null };
}
