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
 *
 * REGRA ATUAL (mudança de regra de negócio confirmada pelo usuário,
 * substituindo a checagem anterior por `primeiro_nivel = "FaceID"` e o
 * cruzamento de histórico cross-operador/cross-equipe): a classificação é
 * puramente por linha, sem histórico. `primeiro_nivel` NÃO é mais critério
 * de exclusão — uma linha "Retido X" conta como retido mesmo que
 * `primeiro_nivel = "FaceID"`. O campo continua disponível na leitura (útil
 * pro card "Efetividade por Tipo de Argumento"), só não é mais usado aqui.
 */

export const STATUS_RETENCAO_ABORTADO = "Abortado";

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

export type ClassificacaoAtendimento = "retido" | "cancelado" | "abortado";

/**
 * Classifica uma linha em "retido", "cancelado" ou "abortado".
 *
 * "Abortado" (por status_retencao, ver comentário acima) tem prioridade
 * sobre `foi_cancelamento` — nos dados reais os dois já são consistentes
 * (Abortado sempre vem com foi_cancelamento=false), mas a checagem por
 * status_retencao é a fonte de verdade semântica.
 */
export function classificarAtendimento(row: {
  foi_cancelamento: boolean | null;
  status_retencao?: string | null;
}): ClassificacaoAtendimento {
  if (isStatusAbortado(row.status_retencao)) {
    return "abortado";
  }
  return row.foi_cancelamento === true ? "cancelado" : "retido";
}
