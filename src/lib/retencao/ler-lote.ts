import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefBR, dataRefHojeBR } from "@/lib/d1-db/parse";
import { filtrarEscopoEmMemoria, type EscopoFiltroParams } from "./escopo";

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
 * Quando vários indicadores precisam do MESMO lote (Analítico), ler uma
 * vez com lerAtendimentosDoLote e passar como `fonte` aos get-*.
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

/** Colunas que os indicadores do Analítico usam (união de todos os get-*). */
export type LinhaAtendimento = {
  usuario_login: string | null;
  usuario_nome: string | null;
  cod_air: string | null;
  status_hora: string | null;
  hora_bucket: number | null;
  foi_cancelamento: boolean | null;
  status_retencao: string | null;
  motivo: string | null;
  submotivo: string | null;
  primeiro_nivel: string | null;
  marca: string | null;
  unidade_nome: string | null;
  unidade_sigla: string | null;
  ult_equipe: string | null;
};

const COLUNAS_ATENDIMENTO =
  "usuario_login, usuario_nome, cod_air, status_hora, hora_bucket, foi_cancelamento, status_retencao, motivo, submotivo, primeiro_nivel, marca, unidade_nome, unidade_sigla, ult_equipe";

/**
 * O lote inteiro (empresa), lido UMA vez. Os get-* aceitam essas linhas como
 * `fonte` e recortam a equipe em memória (filtrarEscopoEmMemoria). Antes o
 * Analítico fazia 8 varreduras paginadas da mesma tabela (7 da equipe + 1 da
 * empresa) por carregamento. Uma leitura só também garante que todos os
 * indicadores saem do mesmo lote.
 */
export async function lerAtendimentosDoLote(): Promise<LinhaAtendimento[]> {
  // Lote de outro dia = Analítico vazio, igual à tabela (ver loteEhDeHoje).
  if (!(await loteEhDeHoje())) return [];
  return lerLoteRetencao<LinhaAtendimento>(
    (supabase) => supabase.from("retencao_atendimentos").select(COLUNAS_ATENDIMENTO),
    "lerAtendimentosDoLote",
  );
}

/**
 * true quando o lote atual foi importado HOJE (data de Brasília). A tabela
 * do Consolidado lê d1_consolidado pela data de hoje (data_ref, gravado no
 * mesmo upload que importado_em); o Analítico lia o último lote de qualquer
 * dia. Depois da virada do dia, antes de um upload novo, a tabela ficava
 * zerada e o Analítico mostrava o dia anterior (auditoria 2026-10-07).
 * Agora os dois blocos ficam vazios juntos até a base do dia chegar.
 */
export async function loteEhDeHoje(): Promise<boolean> {
  const lote = await getLoteAtual();
  if (!lote) return false;
  return dataRefBR(new Date(lote)) === dataRefHojeBR();
}

/**
 * `fonte` informada → recorta em memória; senão lê do banco como sempre
 * (chamadores que usam um get-* isolado não mudam).
 */
export async function lerLoteOuFonte<
  T extends { usuario_login?: string | null; hora_bucket?: number | null },
>(
  fonte: readonly T[] | undefined,
  escopo: EscopoFiltroParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  montarQuery: (supabase: AdminClient) => any,
  contexto: string,
): Promise<T[]> {
  if (fonte) return filtrarEscopoEmMemoria(fonte, escopo);
  return lerLoteRetencao<T>(montarQuery, contexto);
}
