import type { RegraDesconto } from "./types";

export type OverlapWarning = {
  regraA: string;
  regraB: string;
  reason: string;
};

/**
 * Detecta regras sobrepostas dentro do mesmo (tem_ott, duracao_meses).
 * Sobreposição = quando dois ranges de tempo se cruzam.
 */
export function detectOverlap(regras: RegraDesconto[]): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];

  const groups = new Map<string, RegraDesconto[]>();
  for (const r of regras) {
    if (!r.isActive) continue;
    const key = `${r.temOtt}-${r.duracaoMeses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const aMax = a.tempoMaxMeses ?? Infinity;
        const bMax = b.tempoMaxMeses ?? Infinity;

        const overlaps = a.tempoMinMeses <= bMax && b.tempoMinMeses <= aMax;

        if (overlaps) {
          warnings.push({
            regraA: a.id,
            regraB: b.id,
            reason: `Regras com mesmo OTT (${a.temOtt}) e duração ${a.duracaoMeses}m têm faixas de tempo sobrepostas`,
          });
        }
      }
    }
  }

  return warnings;
}
