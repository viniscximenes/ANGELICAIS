/**
 * Agrupamento de motivos em temas do dashboard de retenção.
 *
 * A regra vivia inline dentro de getPorTema; foi extraída para cá sem
 * nenhuma alteração de comportamento, para que o detalhe individual do
 * operador use exatamente o mesmo agrupamento do bloco "Retenção por Tema".
 * Antes disso o popup agrupava pelo motivo cru e mostrava, por exemplo,
 * "Mud. Endereço Inviabilidade" e "Mud. Endereço Viabilidade / Parcial" como
 * duas linhas separadas.
 *
 * Motivo que não está em nenhum grupo passa direto, virando um tema próprio —
 * é o que já acontecia (ex.: "Cobranças e Taxas", "Ouvidoria").
 */
const MOTIVO_PARA_TEMA: Record<string, string> = {
  // Mud. Endereço
  "Mud. Endereço Inviabilidade": "Mud. Endereço",
  "Mud. Endereço Viabilidade / Parcial": "Mud. Endereço",
  "Mudança de Endereço": "Mud. Endereço",

  // Mot. Financeiro
  "Problemas Financeiros": "Mot. Financeiro",
  "Problemas Faturamento": "Mot. Financeiro",
  "Reajuste de valor / NCC": "Mot. Financeiro",
  "Cobranças e Taxas": "Mot. Financeiro",

  // Ins. Atendimento
  "Insatisfação com o Atendimento": "Ins. Atendimento",

  // Ins. Serviço
  "Insatisfação com o Serviço": "Ins. Serviço",
  "Insatisfação com o Produto": "Ins. Serviço",

  // Mud. Provedora — a grafia sem espaço antes de "Preço" aparece na base.
  "Mudança de Provedor - Qualidade": "Mud. Provedora",
  "Mudança de Provedor - Preço": "Mud. Provedora",
  "Mudança de Provedor -Preço": "Mud. Provedora",

  // Outros — duas grafias de "Giga+" convivem na base.
  "Óbito do Titular": "Outros",
  "Cliente diz já ter cancelado": "Outros",
  "Fraude Contratual": "Outros",
  "Área de Risco": "Outros",
  "Ouvidoria": "Outros",
  "Cliente fez novo Plano com a Giga+": "Outros",
  "Cliente fez novo plano com a Giga+": "Outros",
};

/** Motivo cru de retencao_atendimentos → tema agrupado do dashboard. */
export function normalizarTema(motivo: string | null | undefined): string {
  const bruto = (motivo || "Sem Motivo").trim() || "Sem Motivo";
  return MOTIVO_PARA_TEMA[bruto] ?? bruto;
}
