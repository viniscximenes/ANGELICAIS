import { NOTA_OPTIONS, SINALIZACAO_OPTIONS } from "./types";
import type { NotaAvaliacao, SinalizacaoPrincipal } from "./types";

export function labelSinalizacao(value: SinalizacaoPrincipal | null): string {
  if (!value) return "—";
  return SINALIZACAO_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function labelNota(value: NotaAvaliacao | null): string {
  if (!value) return "—";
  return NOTA_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
