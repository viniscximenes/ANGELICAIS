import type {
  ConsolidadoData,
  OperadorConsolidado,
  TotaisSupervisor,
} from "@/lib/google/d1";

export type TabelaSupervisor = {
  operadores: OperadorConsolidado[];
  totais: TotaisSupervisor | null;
  horaReport: string;
};

/**
 * Normaliza nome de supervisor para comparação tolerante a espaço/caixa.
 * O nome na coluna B (operador) e o nome no bloco H:K podem divergir nesses
 * detalhes — normalizar os dois lados evita falha de casamento.
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Monta a "tabela da equipe" de um supervisor:
 * - operadores cujo supervisor (coluna B) casa com o nome informado
 * - os totais pré-calculados do bloco H:K daquele supervisor
 * - a hora do report
 *
 * Casamento por nome normalizado (trim + lowercase) nos dois lados.
 */
export function getTabelaPorSupervisor(
  data: ConsolidadoData,
  supervisor: string,
): TabelaSupervisor {
  const alvo = normalizeName(supervisor);

  const operadores = data.operadores.filter(
    (op) => normalizeName(op.supervisor) === alvo,
  );

  const totais =
    data.totaisPorSupervisor.find(
      (t) => normalizeName(t.supervisor) === alvo,
    ) ?? null;

  return { operadores, totais, horaReport: data.horaReport };
}

/**
 * Lista de supervisores distintos a partir da coluna B dos operadores
 * (não dos blocos H–K, conforme decisão da spec: garante que todo supervisor
 * com operador apareça no filtro). Preserva a primeira grafia encontrada,
 * ignora vazios, ordenado alfabeticamente (pt-BR).
 */
export function getSupervisoresDistintos(
  operadores: OperadorConsolidado[],
): string[] {
  const porChave = new Map<string, string>(); // normalizado → grafia exibida

  for (const op of operadores) {
    const nome = op.supervisor.trim();
    if (!nome) continue;
    const chave = nome.toLowerCase();
    if (!porChave.has(chave)) porChave.set(chave, nome);
  }

  return Array.from(porChave.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}
