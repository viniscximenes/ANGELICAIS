export const META_INDISPONIBILIDADE = 14.5; // %; operador cumpriu se indisponibilidade < 14.5

export type PausasDetalhe = {
  pausa10: string;         // L — NR17
  pausa20: string;         // M — NR17
  pausaParticular: string; // N
  monOuTaref: string;      // O
  trenOuReun: string;      // P
  feedback: string;        // Q
  prePausa: string;        // R
  ativo: string;           // S
  takeBlip: string;        // T
  pausa15: string;         // U
  pausa40: string;         // V
  operacional: string;     // W
  email: string;           // X (pausa E-mail)
  indisponivel: string;    // Y
  sistema: string;         // Z
  pausaSemMotivo: string;  // AA — exibição apenas, não entra nos cálculos
};

export type GestorIndispLinha = {
  email: string;
  gestor?: string;
  indisponibilidade: number | null; // % (ex: 12.3), vem direto da coluna I
  cumpriuMeta: boolean;             // indisponibilidade < META_INDISPONIBILIDADE
  nr17Pct: number | null;           // (Pausa10 + Pausa20) / tempoLogado * 100
  pausaParticularPct: number | null; // PausaParticular / tempoLogado * 100
  outrasPausasPct: number | null;   // demais pausas (O-Z) / tempoLogado * 100
  pausas: PausasDetalhe;
};

export type GestorIndispData = {
  operadores: GestorIndispLinha[];
  horaReport?: string; // BASE - 2!L2, compartilhada com o Tempo Logado
  nomeSupervisorReport?: string | null; // BASE - 2!L2, junto com a hora
};

export type IndispResumo = {
  total: number;
  dentroDaMeta: number;
  acimaDaMeta: number;
  ausentes: number;
  indispMediaEquipe: number | null; // média das indisponibilidades não-null
};
