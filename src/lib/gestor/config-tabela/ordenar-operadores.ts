import type { OperadorConsolidado } from "@/lib/google/d1";

import type { OrdemTabela } from "./types";

/** Mesmo critério de "sem resultado hoje" usado na coloração da EquipeTable. */
function semResultado(op: OperadorConsolidado): boolean {
  return op.pedidos === 0 || op.txRetencao === null;
}

/**
 * Ordena operadores conforme a config do gestor. Regra universal: quem não
 * tem resultado no dia vai sempre por último, em qualquer ordenação
 * (inclusive "padrao" — aí só o grupo sem resultado é empurrado pro fim,
 * mantendo a ordem relativa original de quem tem resultado).
 */
export function ordenarOperadores(
  operadores: OperadorConsolidado[],
  ordem: OrdemTabela,
): OperadorConsolidado[] {
  const comResultado = operadores.filter((op) => !semResultado(op));
  const semResultados = operadores.filter(semResultado);

  if (ordem === "padrao") {
    return [...comResultado, ...semResultados];
  }

  const ordenados = [...comResultado].sort((a, b) => {
    switch (ordem) {
      case "tx_desc":
        return (b.txRetencao ?? 0) - (a.txRetencao ?? 0);
      case "tx_asc":
        return (a.txRetencao ?? 0) - (b.txRetencao ?? 0);
      case "retidos_desc":
        return b.retidos - a.retidos;
      case "retidos_asc":
        return a.retidos - b.retidos;
      case "cancelados_desc":
        return b.cancelados - a.cancelados;
      case "pedidos_desc":
        return b.pedidos - a.pedidos;
      default:
        return 0;
    }
  });

  return [...ordenados, ...semResultados];
}
