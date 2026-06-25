import type {
  OperadorConsolidado,
} from "@/lib/google/d1";

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
