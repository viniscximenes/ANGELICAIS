import type { Turno } from "@/lib/coordenador/types";

export const TURNO_LABEL: Record<Turno, string> = { manha: "Manhã", tarde: "Tarde" };

/** Fração 0–1 → "57.3%" (mesmo formato do resto do painel). */
export function formatTx(tx: number | null): string {
  return tx === null ? "—" : `${(tx * 100).toFixed(1)}%`;
}

/**
 * Impacto de uma equipe na taxa do polo (fração; positivo = sem a equipe o
 * polo subiria, ou seja, ela DERRUBA). Exibido do ponto de vista do polo:
 * derruba → "−2.4%" vermelho · ajuda → "+1.1%" verde · neutro → "0.0%" cinza.
 */
export function formatImpacto(impacto: number | null): { texto: string; classe: string } {
  if (impacto === null) return { texto: "—", classe: "text-muted-foreground" };
  const v = Math.abs(impacto * 100).toFixed(1);
  if (impacto > 0.0005) return { texto: `−${v}%`, classe: "text-danger" };
  if (impacto < -0.0005) return { texto: `+${v}%`, classe: "text-success" };
  return { texto: "0.0%", classe: "text-muted-foreground" };
}

export function abaixoDaMeta(tx: number | null, meta: number): boolean {
  return tx !== null && tx < meta / 100;
}

/** Classe de cor da taxa: vermelho abaixo da meta, verde na meta ou acima. */
export function classeTx(tx: number | null, meta: number): string {
  if (tx === null) return "text-muted-foreground";
  return abaixoDaMeta(tx, meta) ? "text-danger" : "text-success";
}

/** Nome curto da marca (layout aprovado no Figma): Giga+ Fibra → GIGA+, MobWire → MOB, demais em caixa alta. */
const MARCA_CURTA: Record<string, string> = { "giga+ fibra": "GIGA+", mobwire: "MOB" };
export function formatMarca(marca: string): string {
  return MARCA_CURTA[marca.trim().toLowerCase()] ?? marca.trim().toUpperCase();
}
