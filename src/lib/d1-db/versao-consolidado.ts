import type { PerUnitFaixa } from "@/lib/rv/types";

/**
 * Versão da tabela do Consolidado que o polling compara
 * (refreshConsolidadoAction). Duas partes, separadas por "|":
 *
 *  - base: a de getGestorConsolidado (roster + nº de linhas + último
 *    updated_at de d1_consolidado). Só ela indica base nova — é o que
 *    GestorEquipeSection usa pra avisar o Analítico.
 *  - extras: nomes fantasia e faixas de RV. Antes ficavam de fora, e uma aba
 *    aberta mantinha nomes e valores de RV antigos até mudar a base ou dar F5.
 *    Faixas com erro (null) entram como "erro": quando a leitura voltar, a
 *    versão muda e o polling recalcula o RV sozinho.
 */

type NomeFantasiaVersao = { ativo: boolean; mapa: Map<string, string> };

/** djb2 curto — o cliente só compara igualdade. Também usado pela versão do TMA (get-gestor-tma.ts). */
export function hashCurto(texto: string): string {
  let h = 5381;
  for (const ch of texto) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

export function versaoExtrasConsolidado(
  nomeFantasia: NomeFantasiaVersao,
  rvFaixas: PerUnitFaixa[] | null,
): string {
  const nomes = [...nomeFantasia.mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  return hashCurto(
    JSON.stringify({
      nf: nomeFantasia.ativo,
      nomes,
      rv: rvFaixas ?? "erro",
    }),
  );
}

export function montarVersaoConsolidado(base: string, extras: string): string {
  return `${base}|${extras}`;
}

/** Separa a versão do cliente. Versão vazia/antiga sem "|" → nada bate. */
export function separarVersaoConsolidado(versao: string | undefined): {
  base: string | undefined;
  extras: string | undefined;
} {
  if (!versao || !versao.includes("|")) return { base: undefined, extras: undefined };
  const i = versao.lastIndexOf("|");
  return { base: versao.slice(0, i), extras: versao.slice(i + 1) };
}
