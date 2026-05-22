import { fetchLoginLogout } from "./login-logout-sheet";
import { isWithinReportWindow } from "./parse";
import { fetchTempoLogado } from "./tempo-logado-sheet";
import type { LogoutStatus, TempoLogadoData } from "./types";

export type * from "./types";
export { fetchTempoLogado, fetchLoginLogout };

function computeLogoutStatus(
  horaLogout: string | null,
  horaReport: string,
): LogoutStatus {
  if (!horaLogout) return "sem_login";
  if (isWithinReportWindow(horaLogout, horaReport)) return "logado";
  return "deslogado";
}

export async function getTempoLogadoData(): Promise<TempoLogadoData> {
  const [tempoLogadoResult, loginLogout] = await Promise.all([
    fetchTempoLogado(),
    fetchLoginLogout(),
  ]);

  const enriched = loginLogout.map((l) => ({
    ...l,
    logoutStatus: computeLogoutStatus(
      l.horaLogout,
      tempoLogadoResult.horaReport,
    ),
  }));

  return {
    operadores: tempoLogadoResult.operadores,
    loginLogout: enriched,
    horaReport: tempoLogadoResult.horaReport,
  };
}
