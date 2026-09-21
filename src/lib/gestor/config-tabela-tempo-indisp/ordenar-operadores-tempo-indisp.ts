import type { OperadorAnaliticoTempoIndisp } from "@/components/dashboard/tempo-indisponibilidade/merge-tempo-indisp";

import type { OrdemTabelaTempoIndisp } from "./types";

/**
 * "Sem dado" depende de QUAL coluna está ordenando: ordenar por Tempo
 * Logado empurra pro fim quem está "ausente" (sem login hoje); ordenar por
 * Indisp.% empurra quem tem indisponibilidade null (sem upload/sem dado).
 */
function semDadoParaOrdem(op: OperadorAnaliticoTempoIndisp, ordem: OrdemTabelaTempoIndisp): boolean {
  if (ordem === "tempo_logado_desc" || ordem === "tempo_logado_asc") {
    return op.statusTL === "ausente";
  }
  if (ordem === "indisp_desc" || ordem === "indisp_asc") {
    return op.indisponibilidade === null;
  }
  return false;
}

/**
 * Ordena os operadores da tabela unificada conforme a config do gestor.
 * "padrao" NÃO reordena nem reagrupa nada — mantém a ordem que already veio
 * (roster), diferente do "padrao" do consolidado (que empurra quem não tem
 * resultado pro fim mesmo em "padrao"); aqui isso foi pedido explicitamente
 * pra ficar assim.
 */
export function ordenarOperadoresTempoIndisp(
  operadores: OperadorAnaliticoTempoIndisp[],
  ordem: OrdemTabelaTempoIndisp,
): OperadorAnaliticoTempoIndisp[] {
  if (ordem === "padrao") return operadores;

  const comDado = operadores.filter((op) => !semDadoParaOrdem(op, ordem));
  const semDado = operadores.filter((op) => semDadoParaOrdem(op, ordem));

  const ordenados = [...comDado].sort((a, b) => {
    switch (ordem) {
      case "tempo_logado_desc":
        return b.tempoLogadoSegundos - a.tempoLogadoSegundos;
      case "tempo_logado_asc":
        return a.tempoLogadoSegundos - b.tempoLogadoSegundos;
      case "indisp_desc":
        return (b.indisponibilidade ?? 0) - (a.indisponibilidade ?? 0);
      case "indisp_asc":
        return (a.indisponibilidade ?? 0) - (b.indisponibilidade ?? 0);
      default:
        return 0;
    }
  });

  return [...ordenados, ...semDado];
}
