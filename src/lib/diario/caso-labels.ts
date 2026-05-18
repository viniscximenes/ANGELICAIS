import type { DiarioCaso } from "./types";
import { CASO_OPTIONS } from "./types";

export function labelCaso(caso: DiarioCaso): string {
  return CASO_OPTIONS.find((o) => o.value === caso)?.label ?? caso;
}

export function colorCaso(caso: DiarioCaso): string {
  switch (caso) {
    case "pausa_autorizada":
      return "var(--warning)";
    case "fora_jornada":
      return "var(--danger)";
    case "geral":
      return "var(--primary)";
    case "outros":
      return "var(--muted-foreground)";
  }
}
