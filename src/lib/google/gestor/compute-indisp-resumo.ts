import type { GestorIndispLinha, IndispResumo } from "./indisponibilidade-types";

export function computeIndispResumo(operadores: GestorIndispLinha[]): IndispResumo {
  let dentroDaMeta = 0;
  let acimaDaMeta = 0;
  let ausentes = 0;
  let somaIndisp = 0;
  let countIndisp = 0;

  for (const op of operadores) {
    if (op.indisponibilidade === null) {
      ausentes++;
    } else if (op.cumpriuMeta) {
      dentroDaMeta++;
      somaIndisp += op.indisponibilidade;
      countIndisp++;
    } else {
      acimaDaMeta++;
      somaIndisp += op.indisponibilidade;
      countIndisp++;
    }
  }

  return {
    total: operadores.length,
    dentroDaMeta,
    acimaDaMeta,
    ausentes,
    indispMediaEquipe: countIndisp > 0 ? somaIndisp / countIndisp : null,
  };
}
