import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Leitura paginada e consistente de d1_tma_atendimentos — mesmo padrão de
 * lerLoteRetencao (src/lib/retencao/ler-lote.ts, Consolidado).
 *
 * Problema (auditoria 2026-10-09): o PostgREST devolve no máximo 1000 linhas
 * por request. A Rechamada (polo inteiro, ~3 mil/dia) paginava com .range()
 * SEM ordenação — sem ORDER BY o Postgres não garante a mesma ordem entre
 * requests, então o OFFSET podia repetir/pular linhas — e as leituras por
 * equipe nem paginavam (cortariam em silêncio acima de 1000).
 *
 * Solução:
 *  - Toda página ordena por `id` (estável) — depois da ordenação própria do
 *    chamador, se houver (ex.: hora).
 *  - Marcador do lote do dia = maior `created_at` das linhas do data_ref. A
 *    RPC substituir_base_tma apaga e regrava o dia numa transação, com
 *    created_at = now() (constante na transação): um upload no meio da
 *    leitura muda o marcador; um "Limpar Base" o zera. No fim confere o
 *    marcador e, se trocou, lê de novo.
 */

const PAGE_SIZE = 1000;
const TENTATIVAS = 3;

const ERRO_LOTE_TMA_ALTERADO = "A base foi atualizada durante a leitura. Recarregue a página.";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Marcador do lote do dia, ou null sem atendimentos no data_ref. */
async function marcadorDoLote(supabase: AdminClient, dataRef: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("d1_tma_atendimentos")
    .select("created_at")
    .eq("data_ref", dataRef)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ler-atendimentos-tma] erro ao identificar o lote do dia:", error.message);
    throw new Error(error.message);
  }
  return (data?.created_at as string | null | undefined) ?? null;
}

/**
 * Lê todas as páginas dos atendimentos de `dataRef`.
 *
 * `montarQuery` devolve a query com .select() e os filtros (gestor, telefone…)
 * e, opcionalmente, uma ordenação própria — SEM .range() e SEM o filtro de
 * data_ref; o helper acrescenta data_ref, o desempate por id e a paginação.
 * Erro de banco LANÇA (o chamador decide o fallback).
 */
export async function lerAtendimentosTma<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  montarQuery: (supabase: AdminClient) => any,
  dataRef: string,
  contexto: string,
): Promise<T[]> {
  const supabase = createAdminClient();

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const lote = await marcadorDoLote(supabase, dataRef);
    if (!lote) return [];

    const linhas: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await montarQuery(supabase)
        .eq("data_ref", dataRef)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(`[${contexto}] erro ao consultar d1_tma_atendimentos:`, error.message);
        throw new Error(error.message);
      }

      const pagina = (data ?? []) as T[];
      linhas.push(...pagina);
      if (pagina.length < PAGE_SIZE) break;
    }

    if ((await marcadorDoLote(supabase, dataRef)) === lote) return linhas;
    console.warn(`[${contexto}] lote do TMA trocou durante a leitura — relendo.`);
  }

  throw new Error(ERRO_LOTE_TMA_ALTERADO);
}
