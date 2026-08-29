/**
 * Tipos da base de pausas programadas (base_pausas_programadas) — horários
 * programados de login/logout/pausas de cada operador, colados pelo ADM a
 * partir da planilha de escala. Sem relação com d1_indisponibilidade (pausas
 * realizadas).
 */

/** Uma linha parseada da colagem (TSV) — ainda não salva no banco. */
export type PausaProgramadaRow = {
  operatorEmail: string;
  celula: string;
  horaLogin: string;
  horaLogout: string;
  descanso1: string;
  pausa20: string;
  descanso2: string;
};

/** Uma linha já persistida em base_pausas_programadas. */
export type PausaProgramadaDb = PausaProgramadaRow & {
  id: string;
  updatedAt: string;
};
