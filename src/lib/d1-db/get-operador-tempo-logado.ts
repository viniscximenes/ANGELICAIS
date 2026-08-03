import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import { dataRefHojeBR } from "./parse";
import type { LogoutStatus, UserTempoLogadoView } from "./types";

const EMPTY: UserTempoLogadoView = {
  tempoLogado: null,
  loginLogout: null,
  horaReport: "—",
};

function logoutStatusDe(horaLogin: string | null, horaLogout: string | null): LogoutStatus {
  if (!horaLogin) return "sem_login";
  if (!horaLogout) return "logado";
  return "deslogado";
}

/**
 * Lê o Tempo Logado pessoal de um operador (d1_tempo_logado, data de
 * hoje). Substitui getTempoLogadoData + filterTempoLogadoByEmail (Sheets) —
 * mesmo shape de retorno (UserTempoLogadoView).
 */
export async function getOperadorTempoLogado(email: string): Promise<UserTempoLogadoView> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("d1_tempo_logado")
    .select("operator_email, tempo_logado, tempo_restante, logout_estimado, hora_login, hora_logout, report_hora")
    .in("operator_email", getEmailVariants(email))
    .eq("data_ref", dataRefHojeBR())
    .maybeSingle();

  if (error) {
    console.error("[get-operador-tempo-logado] erro ao buscar d1_tempo_logado:", error.message);
    return EMPTY;
  }

  if (!data) return EMPTY;

  return {
    tempoLogado: {
      email: data.operator_email,
      tempoLogado: data.tempo_logado ?? "00:00:00",
      tempoRestante: data.tempo_restante ?? "00:00:00",
      logoutEstimado: data.logout_estimado ?? "—",
    },
    loginLogout: {
      email: data.operator_email,
      horaLogin: data.hora_login,
      horaLogout: data.hora_logout,
      logoutStatus: logoutStatusDe(data.hora_login, data.hora_logout),
    },
    horaReport: data.report_hora ?? "—",
  };
}
