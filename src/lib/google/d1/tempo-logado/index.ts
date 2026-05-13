import { fetchLoginLogout } from "./login-logout-sheet";
import { fetchTempoLogado } from "./tempo-logado-sheet";
import type { TempoLogadoData } from "./types";

export type * from "./types";
export { fetchTempoLogado, fetchLoginLogout };

export async function getTempoLogadoData(): Promise<TempoLogadoData> {
  const [tempoLogadoResult, loginLogout] = await Promise.all([
    fetchTempoLogado(),
    fetchLoginLogout(),
  ]);

  return {
    operadores: tempoLogadoResult.operadores,
    loginLogout,
    horaReport: tempoLogadoResult.horaReport,
  };
}
