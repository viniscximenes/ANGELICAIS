"use client";

import { cn } from "@/lib/utils";
import { OlhoToggleButton } from "@/components/gestor/olho-toggle-button";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_BULLET_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemantico,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";

import { fmtPct, formatLogin, formatLogout } from "./format-operador-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

const NO_FANTASIA: NomeFantasiaSerial = { ativo: false, mapa: {} };

/**
 * Larguras das 8 colunas. As 7 primeiras são FIXAS em px — mesma técnica de
 * EquipeTable (BASE_COLUMN_WIDTHS_PX): cada valor cabe o título inteiro em
 * uma linha. A última usa `minmax(widthPx, 1fr)` pra absorver a sobra do
 * card (sem vão vazio à direita); abaixo do mínimo, o wrapper rola na
 * horizontal.
 */
const COLUNAS = [
  { label: "Operador", widthPx: 200 },
  { label: "Tempo Logado", widthPx: 150 },
  { label: "Login", widthPx: 110 },
  { label: "Logout", widthPx: 140 },
  { label: "Indisp. %", widthPx: 120 },
  { label: "NR17 %", widthPx: 110 },
  { label: "Pausa Particular %", widthPx: 190 },
  { label: "Outras Pausas %", widthPx: 170 },
] as const;

const GRID_COLS = COLUNAS.map((c, idx) =>
  idx === COLUNAS.length - 1 ? `minmax(${c.widthPx}px, 1fr)` : `${c.widthPx}px`,
).join(" ");

/** Altura mínima das linhas (nenhuma célula empilha dois elementos, como a
 * Tx Retenção da EquipeTable — por isso a altura fica travada aqui). */
const LINHA_MIN_HEIGHT_PX = 44;

interface TempoIndispTabelaProps {
  operadores: OperadorAnaliticoTempoIndisp[];
  nomeFantasia?: NomeFantasiaSerial;
  olhoAberto?: boolean;
  onToggleOlho?: () => void;
  /** Clique na linha abre o OperadorAnaliticoDialog — sempre recebe o operador com o email REAL. */
  onRowClick?: (operador: OperadorAnaliticoTempoIndisp) => void;
}

/**
 * Tabela unificada Tempo Logado & Indisponibilidade — mesmo padrão visual
 * da EquipeTable (Consolidado): cabeçalho com os tokens --th-*
 * (.cabecalho-tabela), divisórias de coluna, valor-veredito com bolinha
 * verde/vermelha, linha ruim com fundo --danger 5% e hover semântico
 * (data-meta-linha, .pagina-padrao em globals.css). Usada também no
 * wrapper off-screen do "Copiar imagem" (sem onRowClick → sem hover).
 */
export function TempoIndispTabela({
  operadores,
  nomeFantasia,
  olhoAberto,
  onToggleOlho,
  onRowClick,
}: TempoIndispTabelaProps) {
  const cfg = nomeFantasia ?? NO_FANTASIA;
  const cfgDisplay: NomeFantasiaSerial = olhoAberto && cfg.ativo ? { ...cfg, ativo: false } : cfg;

  return (
    <div className="overflow-hidden">
      {/* overflow-x-auto: abaixo da soma das colunas, rola na horizontal
          (nenhum título é cortado). */}
      <div className="overflow-x-auto scrollbar-tema">
        {/*
          pr-[2px]: folga pro hover:translate-x-0.5 das linhas, reservada no
          pai comum do cabeçalho e das linhas — o deslocamento no hover não
          abre barra de rolagem. Cabeçalho e linhas com o mesmo border-l-2
          (transparente) pra larguras idênticas.
        */}
        {/*
          Semântica de tabela via ARIA (role=table/row/columnheader/rowheader/
          cell) nos mesmos <div> do grid — mesmo padrão da EquipeTable do
          Consolidado: leitor de tela navega por colunas e associa cada valor
          ao cabeçalho e ao operador, sem mudar o layout.
        */}
        <div
          role="table"
          aria-label="Tempo logado e indisponibilidade por operador"
          className="min-w-fit pr-[2px]"
        >
          <div
            role="row"
            className="cabecalho-tabela grid gap-0 border-l-2 border-l-transparent"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            {/* SEM flex: o olho é conteúdo inline depois do texto, pra ficar
                centralizado junto com "Operador" (como em EquipeTable). */}
            <div role="columnheader" className={TABELA_HEADER_CELL_CLASS}>
              {COLUNAS[0].label}
              {onToggleOlho && cfg.ativo && (
                <OlhoToggleButton olhoAberto={!!olhoAberto} onToggle={onToggleOlho} />
              )}
            </div>
            {COLUNAS.slice(1, -1).map((col) => (
              <div key={col.label} role="columnheader" className={TABELA_HEADER_CELL_CLASS}>
                {col.label}
              </div>
            ))}
            <div role="columnheader" className={TABELA_HEADER_CELL_ULTIMA_CLASS}>
              {COLUNAS[COLUNAS.length - 1].label}
            </div>
          </div>

          {operadores.map((op) => {
            // Meta de Tempo Logado (06:20:00) vale pra quem já logou, inclusive
            // "ainda logado" — escala fixa (pedido do usuário, 2026-10-08).
            const belowMetaTL = op.statusTL !== "ausente" && !op.cumpriuMetaTL;
            const isAusente = op.statusTL === "ausente";
            const semDadosIndisp = op.indisponibilidade === null;
            const acimaMetaIndisp = !semDadosIndisp && !op.cumpriuMetaIndisp;
            const ruimNaLinha = belowMetaTL || acimaMetaIndisp;

            // "Sem dados" = ausente nas DUAS fontes (tempo logado E
            // indisponibilidade); dado parcial continua interativo.
            const semDados = isAusente && semDadosIndisp;
            const clicavel = Boolean(onRowClick) && !semDados;

            // Hover de linha clicável: desliza 2px + borda esquerda na cor
            // da meta (o fundo vem do hover semântico, data-meta-linha).
            const hoverClass = clicavel
              ? cn(
                  "hover:translate-x-0.5",
                  ruimNaLinha ? "hover:border-l-[var(--danger)]" : "hover:border-l-[var(--success)]",
                )
              : "hover:bg-transparent hover:border-l-transparent hover:translate-x-0";

            return (
              <div
                key={op.email}
                // Clique do mouse em qualquer parte da linha. O teclado usa o
                // <button> do nome (abaixo): Enter/Espaço nele geram um click
                // que sobe até aqui — mesmo padrão da EquipeTable. Antes a
                // linha era role=button com foco, mas sem tratar Enter/Espaço
                // (e não pode ser button e row ao mesmo tempo).
                role="row"
                data-sem-dados={semDados ? "true" : undefined}
                data-meta-linha={clicavel ? (ruimNaLinha ? "abaixo" : "dentro") : undefined}
                onClick={clicavel ? () => onRowClick!(op) : undefined}
                className={cn(
                  TABELA_LINHA_CLASS,
                  "group border-l-2 border-l-transparent transition-[background-color,border-color,transform] duration-200 ease-out",
                  clicavel && "cursor-pointer",
                  hoverClass,
                )}
                style={{
                  gridTemplateColumns: GRID_COLS,
                  background: fundoLinhaRuim(ruimNaLinha),
                  // Sem opacidade na linha do ausente (antes 0.4): sobre o
                  // texto muted, derrubava o contraste abaixo de 4,5:1 —
                  // mesma decisão da EquipeTable do Consolidado. A linha
                  // continua "apagada" pelo nome em --muted-foreground
                  // (corNomeOperador semDado) e pelos valores "—".
                  minHeight: LINHA_MIN_HEIGHT_PX,
                }}
              >
                <div
                  role="rowheader"
                  className={TABELA_NOME_CELL_CLASS}
                  style={{ color: corNomeOperador({ semDado: isAusente, ruim: ruimNaLinha }) }}
                >
                  {/* O <button> não tem onClick próprio: existe só pro
                      foco/teclado, e o click dele sobe até a linha (sem
                      stopPropagation). Sem botão no PNG (sem onRowClick). */}
                  {clicavel ? (
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      className="block w-full min-w-0 cursor-pointer truncate"
                    >
                      {resolverNomeExibicao(op.email, cfgDisplay)}
                    </button>
                  ) : (
                    resolverNomeExibicao(op.email, cfgDisplay)
                  )}
                </div>
                <div role="cell" className={TABELA_VALOR_BULLET_CLASS}>
                  {isAusente ? (
                    <ValorSemDado />
                  ) : (
                    <ValorSemantico ruim={belowMetaTL}>{op.tempoLogado}</ValorSemantico>
                  )}
                </div>
                <div
                  role="cell"
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.horaLogin === null ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {formatLogin(op.horaLogin)}
                </div>
                <div
                  role="cell"
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    formatLogout(op.statusTL, op.horaLogout) === "—" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {formatLogout(op.statusTL, op.horaLogout)}
                </div>
                <div role="cell" className={TABELA_VALOR_BULLET_CLASS}>
                  {semDadosIndisp ? (
                    <ValorSemDado />
                  ) : (
                    <ValorSemantico ruim={acimaMetaIndisp}>{fmtPct(op.indisponibilidade)}</ValorSemantico>
                  )}
                </div>
                <div
                  role="cell"
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.nr17Pct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {fmtPct(op.nr17Pct)}
                </div>
                <div
                  role="cell"
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.pausaParticularPct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {fmtPct(op.pausaParticularPct)}
                </div>
                {/* Última coluna: sem border-r; min-w-0 igual ao cabeçalho
                    (grids separados precisam do mesmo min-width). */}
                <div
                  role="cell"
                  className={cn(
                    "ds-mono-sm min-w-0 overflow-hidden px-3 py-2 text-center",
                    op.outrasPausasPct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {fmtPct(op.outrasPausasPct)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
