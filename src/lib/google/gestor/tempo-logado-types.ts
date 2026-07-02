export const META_TEMPO_LOGADO_SEGUNDOS = 22800; // 06:20:00

export type StatusPresenca = "completo" | "ainda_logado" | "ausente";

export type GestorTempoLogadoLinha = {
  email: string;
  gestor: string;
  tempoLogado: string;
  tempoLogadoSegundos: number;
  cumpriuMeta: boolean;
  logoutEstimado: string;
  horaLogin: string | null;
  horaLogout: string | null;
  status: StatusPresenca;
};

export type GestorTempoLogadoData = {
  operadores: GestorTempoLogadoLinha[];
  horaReport?: string;
  nomeSupervisorReport?: string | null;
};

export type TempoLogadoResumo = {
  total: number;
  cumpriramMeta: number;
  abaixoDaMeta: number;
  aindaLogados: number;
  ausentes: number;
  tempoMedioSegundos: number;
};
