/**
 * Resolve a guia de leitura do gestor logado.
 *
 * FASE 1: mapeamento fixo (username/email → nome da guia). Há um único gestor
 * (Ana Angelica). Quando houver mais gestores, isto vira dinâmico (vínculo por
 * KPI + override manual, conforme docs/pages/gestor-d-1.md) — provavelmente
 * lido do banco em vez de um Record estático.
 */

const GUIA_POR_GESTOR: Record<string, string> = {
  "ana.angelica": "ANA ANGELICA",
  "ana.angelica@alloha.com": "ANA ANGELICA",
};

/**
 * Dado o login OU e-mail do gestor, devolve o nome da guia de leitura.
 * Retorna `null` se o identificador não estiver mapeado.
 */
export function resolveGuiaGestor(identificador: string): string | null {
  const chave = identificador.trim().toLowerCase();
  return GUIA_POR_GESTOR[chave] ?? null;
}

/**
 * Devolve o nome da guia de tempo logado do gestor ("<GUIA>2").
 * Deriva da guia de consolidado: "ANA ANGELICA" → "ANA ANGELICA2".
 * Retorna `null` se o identificador não estiver mapeado.
 */
export function resolveGuiaTempoLogado(identificador: string): string | null {
  const guia = resolveGuiaGestor(identificador);
  return guia ? `${guia}2` : null;
}
