import type { Plano } from "@/lib/config/planos/types";

export type OfertaPermitida = {
  descontoMaxPct: number;
  duracaoMeses: number;
};

export type ResolucaoTipo =
  | "argumentacao"
  | "reparo"
  | "desconto"
  | "troca"
  | "prioridade_os"
  | "mudanca_endereco"
  | "wifi_6"
  | "mudanca_comodo"
  | "fidelidade_existente"
  | "cancelou";

export type AvisoRetencaoTipo = "fidelidade_proporcional";

export type OfertaRecusadaTipo =
  | "argumentacao"
  | "reparo"
  | "troca"
  | "desconto"
  | "prioridade_os"
  | "mudanca_endereco"
  | "wifi_6"
  | "mudanca_comodo";

export type AvisoCancelamentoTipo =
  | "ultimo_proporcional"
  | "multa_proporcional_fidelidade"
  | "corte_conexao_imediato"
  | "corte_fixo_sem_portabilidade"
  | "corte_ott"
  | "entrega_onu_correio"
  | "recolhimento_90_dias"
  | "entrega_loja";

export type ProtocoloState = {
  dadosOk: boolean;
  motivo: string;

  // Resoluções selecionadas (múltiplas exceto "cancelou", que é exclusivo)
  resolucoes: ResolucaoTipo[];

  // Campos texto-livre por resolução
  planoTrocaTexto: string;
  descontoTexto: string;

  // Aviso pra retenções com plano/desconto
  avisoRetencaoMarcado: boolean;

  // Avisos pra cancelamento (múltiplos)
  avisosCancelamento: AvisoCancelamentoTipo[];

  // Ofertas recusadas quando o cliente cancelou
  ofertasRecusadas: OfertaRecusadaTipo[];

  // Card opcional "Prioridade na O.S" quando cancelado
  prioridadeOsAoCancelar: boolean;
};

export type PerformanceOperador = {
  // KPI real até ontem (oficial — apenas D-2 e anteriores)
  kpiAteOntemRetidos: number;
  kpiAteOntemCancelados: number;
  kpiAteOntemPedidos: number;
  kpiAteOntemTx: number;

  // Estimativa do dia (KPI até ontem + D-1 hoje em andamento)
  estimativaRetidos: number;
  estimativaCancelados: number;
  estimativaPedidos: number;
  estimativaTx: number;
};

export const MOTIVOS = [
  { value: "financeiro", label: "Financeiro" },
  { value: "mudanca_endereco", label: "Mudança de Endereço" },
  { value: "ins_servico", label: "Insatisfação com Serviço" },
  { value: "ins_atendimento", label: "Insatisfação com Atendimento" },
  { value: "mud_provedora", label: "Mudança de Provedora" },
  { value: "outros", label: "Outros" },
] as const;

export const OFERTAS_RECUSADAS = [
  { value: "argumentacao", label: "Argumentação" },
  { value: "reparo", label: "Reparo" },
  { value: "troca", label: "Troca de plano" },
  { value: "desconto", label: "Desconto" },
  { value: "prioridade_os", label: "Prioridade na O.S" },
  { value: "mudanca_endereco", label: "Mudança de endereço" },
  { value: "wifi_6", label: "Wifi-6" },
  { value: "mudanca_comodo", label: "Mudança de cômodo sem custo" },
] as const;

export const RESOLUCOES = [
  { value: "argumentacao", label: "Retido com argumentação" },
  { value: "reparo", label: "Retido com reparo" },
  { value: "desconto", label: "Retido com desconto" },
  { value: "troca", label: "Troca de plano" },
  { value: "prioridade_os", label: "Retido por prioridade na O.S" },
  { value: "mudanca_endereco", label: "Mudança de endereço" },
  { value: "wifi_6", label: "Wifi-6" },
  { value: "mudanca_comodo", label: "Mudança de cômodo sem custo" },
  {
    value: "fidelidade_existente",
    label: "Retido devido a fidelidade existente",
  },
  { value: "cancelou", label: "Cancelou" },
] as const;

export const AVISOS_CANCELAMENTO = [
  {
    value: "ultimo_proporcional",
    label: "ciente da geração do último proporcional de uso",
  },
  {
    value: "multa_proporcional_fidelidade",
    label: "ciente da geração da multa proporcional à fidelidade",
  },
  {
    value: "corte_conexao_imediato",
    label: "ciente do corte de conexão da internet imediato",
  },
  {
    value: "corte_fixo_sem_portabilidade",
    label: "ciente do corte do telefone fixo se não fizer portabilidade",
  },
  {
    value: "corte_ott",
    label: "ciente do corte do OTT incluso no plano",
  },
  {
    value: "entrega_onu_correio",
    label: "ciente da entrega da ONU via correio e possível custo se não fizer",
  },
  {
    value: "recolhimento_90_dias",
    label:
      "ciente que a empresa tem até 90 dias para recolher a ONU na residência",
  },
  {
    value: "entrega_loja",
    label: "ciente que deve fazer a entrega da ONU via loja, já que exigiu",
  },
] as const;

// Re-export Plano para compatibilidade (computeOfertasPermitidas devolve OfertaPermitida)
export type { Plano };
