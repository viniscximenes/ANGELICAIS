/**
 * Classes das 4 tabelas do Analítico (Pausas detalhadas, Aderência, Pausas
 * NR17 não tiradas, Estouro de NR17) — visual de "Desempenho por marca e
 * unidade" do Consolidado: cabeçalho com os tokens --th-* que fica no topo
 * ao rolar dentro do card (.cabecalho-tabela + .cabecalho-tabela-fixo,
 * globals.css), células py-3 px-4 text-xs, linhas separadas só por
 * border/30 (sem divisórias verticais, sem hover), Operador centralizado
 * em font-semibold e fixo na rolagem horizontal (fundo opaco no CSS da
 * página: data-tabela-sticky-header / data-tabela-sticky-nome).
 */
export const HEADER_ROW_CLASS = "cabecalho-tabela cabecalho-tabela-fixo grid gap-0";
export const HEADER_CELL_CLASS =
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2.5 text-center";
export const NOME_CELL_CLASS =
  "min-w-0 truncate whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-foreground";
export const VALOR_CELL_CLASS = "min-w-0 whitespace-nowrap px-4 py-3 text-center text-xs font-medium";
export const LINHA_CLASS = "grid items-center gap-0";

/** Card do slide: título fixo em cima, tabela rolando por dentro (nas duas
 * direções) — o trilho tem altura fixa, como no Consolidado. */
export const CARD_CLASS = "flex h-full min-h-0 flex-col gap-3";
export const ROLAGEM_CLASS = "min-h-0 overflow-auto scrollbar-tema";

/**
 * Piso da coluna Operador: nome real mais longo da base
 * ("francisquele.goncalves", 152px) + padding px-4 (32px). Colunas de dado
 * usam piso ÚNICO por tabela (o do maior título), pra crescerem com
 * larguras idênticas no `minmax(piso, 1fr)`.
 */
export const PISO_OPERADOR_PX = 184;

/** Template de colunas: Operador com peso 1.6fr + N colunas de dado. */
export function gridColunas(qtdColunasDado: number, pisoDadoPx: number): string {
  return [
    `minmax(${PISO_OPERADOR_PX}px, 1.6fr)`,
    ...Array.from({ length: qtdColunasDado }, () => `minmax(${pisoDadoPx}px, 1fr)`),
  ].join(" ");
}
