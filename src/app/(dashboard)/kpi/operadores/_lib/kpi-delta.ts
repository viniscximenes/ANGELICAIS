import { formatDateBR } from "@/lib/utils/format-datetime-br";

import { USAR_VIRGULA_DECIMAL } from "./format-kpi-value-local";

export type EvolucaoDirecao = "up" | "down" | "same";

export interface EvolucaoTxRetencao {
  /** delta já arredondado pra 1 casa (atual − anterior) — a cor/direção decidem a partir DESTE valor, não do bruto (0.04 vira "0.0", neutro). */
  deltaArredondado: number;
  /** "+1.2%" / "−0.8%" / "0.0%" — sinal explícito + sufixo de percentual. */
  texto: string;
  direcao: EvolucaoDirecao;
  /** tx_retencao_bruta é higher_better (subir é sempre bom) — --success (subiu) | --danger (caiu) | --muted-foreground (igual). */
  corVar: "--success" | "--danger" | "--muted-foreground";
  /** Rótulo acessível da célula "Tx. Retenção (Último Report)": "76.9% em 20/09, subiu 1.2 pontos". */
  ariaLabel: string;
}

function aplicarVirgula(s: string): string {
  return USAR_VIRGULA_DECIMAL ? s.replace(".", ",") : s;
}

/**
 * Evolução de tx_retencao_bruta (atual vs. último report anterior) pro selo
 * na divisória entre as duas colunas de retenção. Único KPI com evolução
 * nesta rodada — direction fixo "higher_better" (não vem de kpi_definitions,
 * é uma verdade conhecida desta métrica: reter mais é sempre melhora).
 */
export function computeEvolucaoTxRetencao(params: {
  valorAtual: number;
  valorAnteriorFormatado: string;
  valorAnterior: number;
  dataCorteAnterior: string;
}): EvolucaoTxRetencao {
  const { valorAtual, valorAnteriorFormatado, valorAnterior, dataCorteAnterior } = params;

  // Arredonda ANTES de decidir cor/direção — 0.04 de diferença bruta não
  // deve pintar de sucesso/perigo, fica "0.0" neutro.
  const deltaArredondado = Math.round((valorAtual - valorAnterior) * 10) / 10;

  const direcao: EvolucaoDirecao =
    deltaArredondado > 0 ? "up" : deltaArredondado < 0 ? "down" : "same";
  const corVar =
    direcao === "up" ? "--success" : direcao === "down" ? "--danger" : "--muted-foreground";

  const abs = Math.abs(deltaArredondado);
  const texto =
    direcao === "same"
      ? "0.0%"
      : `${direcao === "up" ? "+" : "−"}${aplicarVirgula(abs.toFixed(1))}%`;

  const dataFormatada = formatDateBR(dataCorteAnterior).slice(0, 5); // dd/mm
  const ariaLabel =
    direcao === "same"
      ? `${valorAnteriorFormatado} em ${dataFormatada}, sem variação`
      : `${valorAnteriorFormatado} em ${dataFormatada}, ${direcao === "up" ? "subiu" : "desceu"} ${aplicarVirgula(abs.toFixed(1))} pontos percentuais`;

  return { deltaArredondado, texto, direcao, corVar, ariaLabel };
}
