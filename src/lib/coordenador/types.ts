/** Tipos da visão do coordenador — sem dependência de servidor (usável em Client Components). */

/** Mínimo de pedidos pra entrar na lista de baixo rendimento — evita taxa de 0/1 pedido. */
export const MIN_PEDIDOS_BAIXO_RENDIMENTO = 3;

/** Temas com meta própria (mesma lista do "Metas por Tema" do /s). Tema fora da lista usa a meta do polo. */
export const TEMAS_META = [
  "Mot. Financeiro",
  "Ins. Atendimento",
  "Ins. Serviço",
  "Mud. Endereço",
  "Mud. Provedora",
  "Outros",
] as const;

/** Meta de TX Retenção (0–100) de cada tema; tema sem valor salvo = meta do polo. */
export type MetasTemas = Record<string, number>;

/** Meta do tema, caindo na meta do polo quando não há valor salvo. */
export function metaDoTema(tema: string, metasTemas: MetasTemas, metaPolo: number): number {
  const valor = metasTemas[tema];
  return typeof valor === "number" && !Number.isNaN(valor) ? valor : metaPolo;
}

export type Turno = "manha" | "tarde";

export type ResumoTaxa = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  /** Fração 0–1; null quando não há pedidos. */
  txRetencao: number | null;
};

/** Tipo de retenção (a partir de status_retencao) — mede o "custo" da retenção. */
export type TipoRetencao =
  | "Sem concessão"
  | "Desconto"
  | "Troca de plano"
  | "Troca de plano + desconto"
  | "Negociação"
  | "Outros";

export const TIPOS_RETENCAO: TipoRetencao[] = [
  "Sem concessão",
  "Desconto",
  "Troca de plano",
  "Troca de plano + desconto",
  "Negociação",
  "Outros",
];

export type ContagemTipoRetencao = Record<TipoRetencao, number>;

export type SupervisorLinha = ResumoTaxa & {
  gestorId: string;
  nome: string;
  /** nome.sobrenome do email corporativo do supervisor (ex.: gabriel.ximenes). */
  login: string;
  turno: Turno | null;
  operadores: number;
  /** Operadores com pedidos e taxa abaixo da meta. */
  abaixoDaMeta: number;
  /**
   * Pontos percentuais que a taxa do polo ganharia sem esta equipe (fração
   * 0–1). Positivo = a equipe está puxando a taxa do polo pra baixo.
   */
  impactoPolo: number | null;
  /** Atendimentos abortados (FaceID/etapa não concluída) — fora da taxa. */
  abortados: number;
  /** Só os abortados com status "FaceID não realizado". */
  faceIdNaoRealizado: number;
  jornadaAborto: JornadaAborto;
  /** Operadores do roster sem nenhum atendimento no dia. */
  semProducao: number;
  tiposRetencao: ContagemTipoRetencao;
  /** Cancelamentos e retenções por tema dentro da equipe. */
  temas: Record<string, { retidos: number; cancelados: number }>;
};

export type OperadorLinha = ResumoTaxa & {
  email: string;
  /** Login sem domínio — é o "nome" exibido (sem nome fantasia). */
  login: string;
  gestorId: string;
  supervisor: string;
  turno: Turno | null;
  /** Operador do roster sem nenhum atendimento no dia. */
  semDado: boolean;
  abortados: number;
};

export type AtendimentoTecnico = {
  /** "HH:MM" (horário de Brasília) do desfecho do atendimento. */
  horario: string | null;
  hora: number | null;
  /** Bucket do gráfico de evolução (7 = "< 08", 8..19, 20 = "≥ 20") e seu rótulo. */
  bucket: number | null;
  bucketLabel: string | null;
  contrato: string;
  cliente: string;
  classe: "retido" | "cancelado";
  tema: string;
  motivo: string;
  submotivo: string;
  status: string;
  /** Alavanca usada na retenção (primeiro_nivel) — só existe em retidos. */
  argumento: string | null;
  tipoRetencao: TipoRetencao | null;
  marca: string;
  unidade: string;
};

/**
 * Caminho dos contratos que tiveram aborto (Face ID/etapa) em QUALQUER
 * tentativa do dia — a base guarda várias tentativas por contrato; a taxa só
 * usa o desfecho final, mas o aborto no meio do caminho também importa.
 */
export type JornadaAborto = {
  /** Linhas "Abortado…" na base bruta (cada tentativa conta). */
  tentativasAbortadas: number;
  /** Contratos com pelo menos um aborto. */
  contratosComAborto: number;
  /** …cujo desfecho final foi abortado (= "abortados" da taxa). */
  terminaramAbortados: number;
  /** …que depois viraram cancelamento. */
  viraramCancelamento: number;
  /** …que depois foram retidos. */
  viraramRetencao: number;
};

export type RecorteTaxa = ResumoTaxa & { chave: string; detalhe?: string };

/** Taxa por estado (UF) com as cidades/unidades dentro — bloco "Taxa por regional". */
export type RegionalTaxa = ResumoTaxa & {
  uf: string;
  /** Nome do estado ("Não identificado" quando a unidade não está mapeada). */
  nome: string;
  cidades: RecorteTaxa[];
};

export type FaceIdResumo = {
  abortados: number;
  /** Só os abortados com status "FaceID não realizado". */
  naoRealizado: number;
  /** Abortados / (pedidos + abortados). */
  percentual: number | null;
  /** Tentativas abortadas por status (base bruta, cada tentativa conta). */
  porStatus: { status: string; quantidade: number }[];
  jornada: JornadaAborto;
};

export type SubmotivoTema = { submotivo: string; retidos: number; cancelados: number };

export type TemaPolo = ResumoTaxa & {
  tema: string;
  /** Fração dos cancelamentos do polo que caíram neste tema. */
  participacaoCancelamentos: number;
  canceladosManha: number;
  canceladosTarde: number;
  submotivos: SubmotivoTema[];
};

export type ImpactoSupervisorHora = {
  gestorId: string;
  retidos: number;
  cancelados: number;
  /** Mesmo conceito de SupervisorLinha.impactoPolo, só dentro da hora. */
  impacto: number | null;
};

export type HoraPolo = ResumoTaxa & {
  hora: number;
  label: string;
  /** Taxa acumulada do polo do início do dia até esta hora. */
  txAcumulada: number | null;
  /** Supervisores com atendimento na hora, quem mais derrubou primeiro. */
  supervisores: ImpactoSupervisorHora[];
};

export type CoordenadorConsolidado = {
  polo: ResumoTaxa;
  manha: ResumoTaxa;
  tarde: ResumoTaxa;
  supervisores: SupervisorLinha[];
  operadores: OperadorLinha[];
  baixoRendimento: OperadorLinha[];
  /** Atendimentos do dia por login (prefixo do email), pro detalhe técnico. */
  atendimentosPorOperador: Record<string, AtendimentoTecnico[]>;
  temas: TemaPolo[];
  evolucao: HoraPolo[];
  tiposRetencaoPolo: ContagemTipoRetencao;
  faceId: FaceIdResumo;
  marcas: RecorteTaxa[];
  /** Unidades com mais cancelamentos (top 15). */
  unidades: RecorteTaxa[];
  /** Todas as unidades agrupadas por estado (uf-por-unidade.ts). */
  regionais: RegionalTaxa[];
  reportHora: string | null;
  /** Quem fez o último report (upload da base), já formatado pra exibição. */
  reportNomeSupervisor: string | null;
};
