/**
 * Classificação central de um atendimento de retenção a partir de
 * `foi_cancelamento`, `status_retencao` e `primeiro_nivel`.
 *
 * Desde a validação por FaceID antes de efetivar um cancelamento, um
 * atendimento sem resposta/validação do cliente fica com
 * status_retencao = "Abortado" (e foi_cancelamento = false, por não ter sido
 * efetivamente cancelado). Esse caso é um estado neutro/pendente: não é
 * sucesso de retenção nem fracasso (cancelamento), então não deve entrar no
 * numerador nem no denominador da TX RETENÇÃO — mas segue contando no total
 * de PEDIDOS, porque o atendimento de fato existiu.
 *
 * REGRA CONFIRMADA (com evidência de dados, ver export de fechamento
 * diário): retenções feitas AUTOMATICAMENTE pelo fluxo de FaceID (cliente
 * tem 5min pra confirmar o cancelamento; se não confirma, o sistema retém o
 * contrato sozinho, sem negociação real de operador) vêm com
 * `primeiro_nivel = "FaceID"` — mesmo quando `status_retencao` aparece como
 * "Retido sem concessões" (não dá pra distinguir só pelo status). Diferente
 * de "Abortado" (que ainda conta em PEDIDOS), esses casos devem SUMIR do
 * cálculo por completo: não contam nem como retido, nem no total/
 * denominador de atendimento algum — por isso reaproveitam a MESMA
 * classificação "abortado" (tratamento idêntico em todo lib/retencao/*, que
 * já filtra por essa classe em todo lugar), em vez de uma categoria nova.
 */

export const STATUS_RETENCAO_ABORTADO = "Abortado";
export const PRIMEIRO_NIVEL_FACEID = "FaceID";

/**
 * ACHADO ADICIONAL (bug pré-existente, não introduzido nesta rodada):
 * `status_retencao` NUNCA aparece como "Abortado" puro nos dados reais — é
 * sempre "Abortado - FaceID não realizado" ou "Abortado - FaceID reprovado"
 * (confirmado varrendo todos os valores distintos da tabela). A comparação
 * exata (`===`) usada aqui antes NUNCA batia com nenhum valor real, então
 * TODA linha "Abortado - ..." caía no fallback `foi_cancelamento === true ?
 * "cancelado" : "retido"` — como essas linhas têm foi_cancelamento=false,
 * eram contadas como "RETIDO", nunca excluídas. Trocado pra `startsWith`
 * (prefixo "abortado"), cobrindo qualquer variante presente ou futura.
 */
function isStatusAbortado(statusRetencao: string | null | undefined): boolean {
  return (statusRetencao ?? "").trim().toLowerCase().startsWith(STATUS_RETENCAO_ABORTADO.toLowerCase());
}

function isPrimeiroNivelFaceId(primeiroNivel: string | null | undefined): boolean {
  return (primeiroNivel ?? "").trim().toLowerCase() === PRIMEIRO_NIVEL_FACEID.toLowerCase();
}

export type ClassificacaoAtendimento = "retido" | "cancelado" | "abortado";

/**
 * Classifica uma linha em "retido", "cancelado" ou "abortado".
 *
 * "Abortado" (por status OU por primeiro_nivel = "FaceID", ver comentário
 * acima) tem prioridade sobre `foi_cancelamento` — nos dados reais os dois
 * já são consistentes (Abortado sempre vem com foi_cancelamento=false), mas
 * a checagem por status_retencao/primeiro_nivel é a fonte de verdade
 * semântica.
 */
export function classificarAtendimento(row: {
  foi_cancelamento: boolean | null;
  status_retencao?: string | null;
  primeiro_nivel?: string | null;
}): ClassificacaoAtendimento {
  if (isStatusAbortado(row.status_retencao) || isPrimeiroNivelFaceId(row.primeiro_nivel)) {
    return "abortado";
  }
  return row.foi_cancelamento === true ? "cancelado" : "retido";
}
