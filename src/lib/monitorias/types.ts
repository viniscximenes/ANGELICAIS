export type SinalizacaoPrincipal =
  | "nao_houve_falha_grave"
  | "atendimento_nao_humanizado"
  | "demora_apresentacao"
  | "script_incorreto"
  | "falha_processo"
  | "transferencia_indevida"
  | "omissao_atendimento"
  | "destratou_cliente";

export type NotaAvaliacao =
  | "muito_ruim"
  | "ruim"
  | "neutro"
  | "bom"
  | "muito_bom";

export type MonitoriaStatus = "pending" | "finalized" | "sent";

export type Monitoria = {
  id: string;

  operatorEmail: string;
  auxResponsibleEmail: string;

  idChamada: string;
  contratoCliente: string;
  dataAtendimento: string;
  linkOnedrive: string;

  encaminhouPesquisa: boolean | null;
  sinalizacaoPrincipal: SinalizacaoPrincipal | null;
  notaApresentacao: NotaAvaliacao | null;
  notaComunicacao: NotaAvaliacao | null;
  notaProcesso: NotaAvaliacao | null;
  resumoAtendimento: string | null;

  status: MonitoriaStatus;
  finalizedAt: string | null;
  finalizedBy: string | null;
  sentAt: string | null;
  sentBy: string | null;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

/**
 * Versão enriquecida com nomes vindos de profiles. Para UI.
 */
export type MonitoriaWithNames = Monitoria & {
  operatorName: string | null;
  auxResponsibleName: string | null;
};

export const SINALIZACAO_OPTIONS: {
  value: SinalizacaoPrincipal;
  label: string;
}[] = [
  { value: "nao_houve_falha_grave", label: "Não houve falha grave" },
  { value: "atendimento_nao_humanizado", label: "Atendimento não humanizado" },
  {
    value: "demora_apresentacao",
    label: "Demora na apresentação (5s voz / 20s texto)",
  },
  { value: "script_incorreto", label: "Script incorreto/agressivo" },
  { value: "falha_processo", label: "Houve falha no processo/atendimento" },
  { value: "transferencia_indevida", label: "Transferência indevida" },
  { value: "omissao_atendimento", label: "Omissão de atendimento" },
  { value: "destratou_cliente", label: "Destratou cliente" },
];

export const NOTA_OPTIONS: { value: NotaAvaliacao; label: string }[] = [
  { value: "muito_ruim", label: "Muito ruim" },
  { value: "ruim", label: "Ruim" },
  { value: "neutro", label: "Neutro" },
  { value: "bom", label: "Bom" },
  { value: "muito_bom", label: "Muito bom" },
];
