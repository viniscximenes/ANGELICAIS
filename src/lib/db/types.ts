import type { RegistroAtencao } from "./detectar-registros";

export type TemaTipo = "pausa" | "tempo_logado";

export type Tema = {
  id: string;
  tipo: TemaTipo;
  nome: string;
  textoMotivo: string;
};

export type DiaDisponivel = {
  dataRef: string; // YYYY-MM-DD
  linhas: number;
};

export type MesSelecionado = "atual" | "passado";

/** Um registro detectado (RegistroAtencao) + se já foi finalizado pelo supervisor. */
export type RegistroComStatus = RegistroAtencao & {
  finalizado: boolean;
  temaNome: string | null;
  textoGerado: string | null;
};

export type AgenteRegistros = {
  agentUser: string;
  agentName: string;
  registros: RegistroComStatus[];
};

/** Linha de db_registros_finalizados. */
export type RegistroFinalizado = {
  id: string;
  dataRef: string;
  agentUsername: string;
  agentNome: string;
  tipo: TemaTipo;
  reasonCode: string | null;
  duracao: string; // HH:MM:SS (coluna `duracao` é text no banco)
  temaNome: string;
  textoGerado: string;
};
