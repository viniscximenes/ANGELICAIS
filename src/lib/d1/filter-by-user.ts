import type {
  D1Data,
  OperadorConsolidado,
  OperadorContratos,
  OperadorMotivos,
} from "@/lib/google/d1";

export type UserD1View = {
  operador: OperadorConsolidado | null;
  contratos: OperadorContratos | null;
  motivos: OperadorMotivos | null;
  horaReport: string;
};

export function filterByUserEmail(data: D1Data, email: string): UserD1View {
  const normalizedEmail = email.trim().toLowerCase();

  return {
    operador:
      data.consolidado.operadores.find((o) => o.email === normalizedEmail) ??
      null,
    contratos:
      data.contratos.find((c) => c.email === normalizedEmail) ?? null,
    motivos: data.motivos.find((m) => m.email === normalizedEmail) ?? null,
    horaReport: data.consolidado.equipe.horaReport,
  };
}
