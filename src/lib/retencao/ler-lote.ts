import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Leitura paginada e consistente de retencao_atendimentos.
 *
 * Problema (auditoria 2026-10-07): os get-* liam a tabela em páginas de 1000
 * com .range() SEM ordenação e sem referência de lote. Um upload entre duas
 * páginas (substituir_base_consolidado troca a tabela inteira) podia misturar
 * linhas de lotes diferentes ou pular linhas; sem ORDER BY o Postgres não
 * garante a mesma ordem entre requests, então mesmo sem upload o OFFSET podia
 * repetir/pular registros.
 *
 * Solução:
 *  - Identificador do lote = `importado_em`. A RPC grava todas as linhas com
 *    now(), que é constante dentro da transação, e apaga o lote anterior na
 *    mesma transação: a tabela sempre tem exatamente UM importado_em.
 *  - Toda página filtra por esse importado_em e ordena por `id` (estável).
 *  - No fim, confere se o lote ainda é o atual. Se trocou no meio, as páginas
 *    seguintes teriam voltado vazias (leitura incompleta): lê de novo.
 *
 * Para várias consultas que precisam enxergar o MESMO lote (ex.: os
 * indicadores do Analítico, em Promise.all), envolver com comLoteEstavel.
 */

const PAGE_SIZE = 1000;
const TENTATIVAS = 3;

export const ERRO_LOTE_ALTERADO =
  "A base foi atualizada durante a leitura. Recarregue a página.";

type AdminClient = ReturnType<typeof createAdminClient>;

/** importado_em do lote atual, ou null com a tabela vazia. */
export async function getLoteAtual(
  supabase: AdminClient = createAdminClient(),
): Promise<string | null> {
  const { data, error } = await supabase
    .from("retencao_atendimentos")
    .select("importado_em")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ler-lote] erro ao identificar o lote atual:", error.message);
    throw new Error(error.message);
  }
  return (data?.importado_em as string | null | undefined) ?? null;
}

/**
 * Lê todas as páginas do lote atual.
 *
 * `montarQuery` devolve a query com .select() e os filtros (escopo, período…),
 * SEM .range()/.order() — o helper acrescenta lote, ordenação e paginação.
 */
export async function lerLoteRetencao<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  montarQuery: (supabase: AdminClient) => any,
  contexto: string,
): Promise<T[]> {
  const supabase = createAdminClient();

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const lote = await getLoteAtual(supabase);
    if (!lote) return [];

    const linhas: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await montarQuery(supabase)
        .eq("importado_em", lote)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(`[${contexto}] erro ao consultar retencao_atendimentos:`, error.message);
        throw new Error(error.message);
      }

      const pagina = (data ?? []) as T[];
      linhas.push(...pagina);
      if (pagina.length < PAGE_SIZE) break;
    }

    if ((await getLoteAtual(supabase)) === lote) return linhas;
    console.warn(`[${contexto}] lote trocou durante a leitura — relendo.`);
  }

  throw new Error(ERRO_LOTE_ALTERADO);
}

/**
 * Roda `ler` (normalmente um Promise.all de vários get-*) e garante que todas
 * as consultas enxergaram o mesmo lote: cada upload gera um importado_em novo,
 * então lote igual antes e depois = nenhum upload no meio.
 */
export async function comLoteEstavel<T>(ler: () => Promise<T>): Promise<T> {
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const antes = await getLoteAtual();
    const resultado = await ler();
    if ((await getLoteAtual()) === antes) return resultado;
    console.warn("[comLoteEstavel] lote trocou durante a leitura — relendo.");
  }
  throw new Error(ERRO_LOTE_ALTERADO);
}
