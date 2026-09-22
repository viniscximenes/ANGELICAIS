import type { OperadorTma } from "@/lib/tma/get-gestor-tma";

import type { OrdemTabelaTma } from "./types";

/**
 * "Sem dado" pra ordenação por TMA: tmaSegundos null (sem atendimento
 * computado hoje) vai sempre pro final, em ambas as direções — mesma regra
 * de "quem não tem resultado fica no fim" usada pelo Consolidado
 * (ordenar-operadores.ts) e por Tempo Logado/Indisponibilidade
 * (ordenar-operadores-tempo-indisp.ts). Ordenar por quantidade de
 * atendimentos não tem esse problema: quem não tem dado já tem
 * qtdAtendimentos = 0, então cai naturalmente nas pontas.
 */
function semDadoParaOrdem(op: OperadorTma, ordem: OrdemTabelaTma): boolean {
  if (ordem === "tma_asc" || ordem === "tma_desc") {
    return op.tmaSegundos === null;
  }
  return false;
}

/**
 * Ordena os operadores da tabela do TMA conforme a config do gestor.
 * "padrao" não reordena — a lista já chega de getGestorTma com o "padrao"
 * aplicado (por operator_email, sem dado no final).
 */
export function ordenarOperadoresTma(operadores: OperadorTma[], ordem: OrdemTabelaTma): OperadorTma[] {
  if (ordem === "padrao") return operadores;

  const comDado = operadores.filter((op) => !semDadoParaOrdem(op, ordem));
  const semDado = operadores.filter((op) => semDadoParaOrdem(op, ordem));

  const ordenados = [...comDado].sort((a, b) => {
    switch (ordem) {
      case "tma_asc":
        return (a.tmaSegundos ?? 0) - (b.tmaSegundos ?? 0);
      case "tma_desc":
        return (b.tmaSegundos ?? 0) - (a.tmaSegundos ?? 0);
      case "qtd_desc":
        return b.qtdAtendimentos - a.qtdAtendimentos;
      case "qtd_asc":
        return a.qtdAtendimentos - b.qtdAtendimentos;
      default:
        return 0;
    }
  });

  return [...ordenados, ...semDado];
}
