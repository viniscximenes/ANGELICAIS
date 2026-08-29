/**
 * Reason codes que contam como tempo INDISPONÍVEL, e a coluna de
 * d1_indisponibilidade em que cada um é somado.
 *
 * Uma definição só — se a lista mudar, o upload e o analítico mudam juntos.
 *
 * Ficam DE FORA (não somam indisponibilidade): "No Reason", "Not Ready",
 * "Forced", "Pausa 1h", "Pausa 15", "Pausa 40" e "Operacional" — os quatro
 * últimos por não terem coluna própria no schema novo (gap conhecido,
 * documentado em d1-db/types.ts).
 */
export const REASON_TO_COLUNA: Record<string, string> = {
  "pausa 10": "pausa10",
  "pausa 20": "pausa20",
  "pausa particular": "pausa_particular",
  "monitoramento ou tarefa": "pausa_mon_taref",
  "treinamento ou reunião": "pausa_treinamento",
  "feedback": "pausa_feedback",
  "pré pausa": "pausa_pre_pausa",
  "ativo": "pausa_ativo",
  "take blip": "pausa_take_blip",
  "e-mail": "pausa_email",
  "indisp.": "pausa_indisponivel",
  "system": "pausa_sistema",
};

export const COLUNAS_PAUSA = Array.from(new Set(Object.values(REASON_TO_COLUNA)));
