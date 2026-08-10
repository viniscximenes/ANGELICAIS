import type { PausasDetalhe } from "@/lib/d1-db/types";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

export const PAUSA_FIELDS: { key: keyof PausasDetalhe; label: string }[] = [
  { key: "pausa10", label: "Pausa 10" },
  { key: "pausa20", label: "Pausa 20" },
  { key: "pausaParticular", label: "Particular" },
  { key: "monOuTaref", label: "Monitoramento/Tarefa" },
  { key: "trenOuReun", label: "Treinamento/Reunião" },
  { key: "feedback", label: "Feedback" },
  { key: "prePausa", label: "Pré Pausa" },
  { key: "ativo", label: "Ativo" },
  { key: "takeBlip", label: "Take Blip" },
  { key: "email", label: "E-mail" },
  { key: "indisponivel", label: "Indisponível" },
  { key: "sistema", label: "Sistema" },
];

export function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

export function formatLogin(horaLogin: string | null): string {
  return horaLogin ?? "—";
}

export function formatLogout(
  status: OperadorAnaliticoTempoIndisp["statusTL"],
  horaLogout: string | null,
): string {
  if (status === "ainda_logado") return "Ainda logado";
  if (status === "ausente") return "—";
  return horaLogout ?? "—";
}

export function formatDiferenca(diferencaMin: number | null): string {
  if (diferencaMin === null) return "—";
  if (diferencaMin === 0) return "0min";
  return `${diferencaMin > 0 ? "+" : ""}${diferencaMin}min`;
}
