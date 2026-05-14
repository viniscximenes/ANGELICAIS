import type {
  IndisponibilidadeData,
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";

export type UserIndispView = {
  indisp: OperadorIndisp | null;
  pausa: OperadorPausa | null;
  horaReport: string;
};

export function filterIndispByEmail(
  data: IndisponibilidadeData,
  email: string,
): UserIndispView {
  const normalizedEmail = email.trim().toLowerCase();

  return {
    indisp:
      data.operadoresIndisp.find((o) => o.email === normalizedEmail) ?? null,
    pausa:
      data.operadoresPausa.find((p) => p.email === normalizedEmail) ?? null,
    horaReport: data.horaReport,
  };
}
