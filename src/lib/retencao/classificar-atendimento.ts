/**
 * Classificação central de um atendimento de retenção a partir de
 * `foi_cancelamento` e `status_retencao`.
 *
 * Desde a validação por FaceID antes de efetivar um cancelamento, um
 * atendimento sem resposta/validação do cliente fica com
 * status_retencao = "Abortado" (e foi_cancelamento = false, por não ter sido
 * efetivamente cancelado). Esse caso é um estado neutro/pendente: não é
 * sucesso de retenção nem fracasso (cancelamento), então não deve entrar no
 * numerador nem no denominador da TX RETENÇÃO — mas segue contando no total
 * de PEDIDOS, porque o atendimento de fato existiu.
 */

export const STATUS_RETENCAO_ABORTADO = "Abortado";

function isStatusAbortado(statusRetencao: string | null | undefined): boolean {
  return (statusRetencao ?? "").trim().toLowerCase() === STATUS_RETENCAO_ABORTADO.toLowerCase();
}

type ClassificacaoAtendimento = "retido" | "cancelado" | "abortado";

/**
 * Classifica uma linha em "retido", "cancelado" ou "abortado".
 *
 * "Abortado" tem prioridade sobre `foi_cancelamento` — nos dados reais os
 * dois já são consistentes (Abortado sempre vem com foi_cancelamento=false),
 * mas a checagem por status_retencao é a fonte de verdade semântica.
 */
export function classificarAtendimento(row: {
  foi_cancelamento: boolean | null;
  status_retencao?: string | null;
}): ClassificacaoAtendimento {
  if (isStatusAbortado(row.status_retencao)) return "abortado";
  return row.foi_cancelamento === true ? "cancelado" : "retido";
}
