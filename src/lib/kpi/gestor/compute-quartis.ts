import type { KpiDefinition } from "@/lib/kpi/types";

type QuartilResultado = {
  quartil: 1 | 2 | 3 | 4;
  rank: number;
  total: number; // total de operadores ranqueados naquele KPI (sem nulls)
};

export type OperadorParaQuartil = {
  email: string;
  valores: Map<string, number | null>; // slug → valor_numerico
};

/**
 * Função PURA: dado um conjunto de operadores e as definições de KPI, calcula
 * por KPI ranqueável o rank e o quartil de cada operador.
 *
 * Regras:
 * - Só KPIs com direction higher_better | lower_better entram.
 * - Operadores sem valor (null) ficam FORA do ranking daquele KPI.
 * - Ordenação estável, ranks sequenciais (sem pular em empates).
 * - higher_better → maior valor = rank 1; lower_better → menor valor = rank 1.
 * - Quartil por posição: quartil = ceil((rank / N) × 4), limitado a [1, 4].
 *   Com N=24: ranks 1-6 → Q1, 7-12 → Q2, 13-18 → Q3, 19-24 → Q4.
 *
 * @returns Map<email, Map<slug, QuartilResultado>>
 *   Apenas slugs em que o operador tem valor aparecem no mapa interno.
 */
export function computeQuartis(
  operadores: OperadorParaQuartil[],
  definitions: KpiDefinition[],
): Map<string, Map<string, QuartilResultado>> {
  const ranqueaveis = definitions.filter(
    (d) => d.direction === "higher_better" || d.direction === "lower_better",
  );

  // Inicializar resultado: um Map vazio por operador
  const resultado = new Map<string, Map<string, QuartilResultado>>();
  for (const op of operadores) {
    resultado.set(op.email, new Map());
  }

  for (const def of ranqueaveis) {
    const { slug, direction } = def;

    // Candidatos com valor não-nulo neste KPI
    const candidatos: { email: string; valor: number }[] = [];
    for (const op of operadores) {
      const v = op.valores.get(slug) ?? null;
      if (v !== null) {
        candidatos.push({ email: op.email, valor: v });
      }
    }

    if (candidatos.length === 0) continue;

    // Ordena: higher_better → desc (maior primeiro); lower_better → asc (menor primeiro)
    // Array.sort é estável em V8/Node ≥ 11, garantindo ordenação consistente em empates.
    candidatos.sort((a, b) =>
      direction === "higher_better" ? b.valor - a.valor : a.valor - b.valor,
    );

    const n = candidatos.length;

    candidatos.forEach(({ email }, idx) => {
      const rank = idx + 1;
      // ceil((rank / N) * 4) → Q1 para os melhores 25%, Q4 para os piores 25%.
      const quartilRaw = Math.ceil((rank / n) * 4);
      const quartil = Math.min(4, Math.max(1, quartilRaw)) as 1 | 2 | 3 | 4;
      resultado.get(email)!.set(slug, { quartil, rank, total: n });
    });
  }

  return resultado;
}
