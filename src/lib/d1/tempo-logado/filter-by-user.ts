import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
  TempoLogadoData,
} from "@/lib/google/d1/tempo-logado";

export type UserTempoLogadoView = {
  tempoLogado: OperadorTempoLogado | null;
  loginLogout: OperadorLoginLogout | null;
  horaReport: string;
};

export function filterTempoLogadoByEmail(
  data: TempoLogadoData,
  email: string,
): UserTempoLogadoView {
  const normalizedEmail = email.trim().toLowerCase();

  return {
    tempoLogado:
      data.operadores.find((o) => o.email === normalizedEmail) ?? null,
    loginLogout:
      data.loginLogout.find((l) => l.email === normalizedEmail) ?? null,
    horaReport: data.horaReport,
  };
}
