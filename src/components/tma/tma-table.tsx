"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";
import { cn } from "@/lib/utils";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { getAtendimentosOperadorTmaAction } from "@/lib/tma/actions/get-atendimentos-operador-tma-action";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { TmaDetalheDialog } from "./tma-detalhe-dialog-lazy";

export type TmaLinha = OperadorTma & {
  nomeExibicao: string;
};

interface TmaTableProps {
  linhas: TmaLinha[];
  headerButton?: ReactNode;
  /** Repassado até TmaDetalheDialog (gráfico "TMA por Hora" do operador) — ver comentário em gestor-tma-section.tsx. */
  thresholdConfig: TmaThresholdConfig;
  /** false na cópia oculta do "Copiar imagem": sem modal de detalhe (nunca é clicada). */
  comDetalhe?: boolean;
}

// Mesma abordagem da EquipeTable do Consolidado (grid de <div>, não <table>):
// header e linhas leem ESTA mesma string, então nunca desalinham. Proporção
// 3:2:2 (Operador : TMA : Qtd. Ligações) — a mesma razão Operador(3) : valor(2)
// do `gridCols` do ExcelTable/EquipeTable. Em `fr` (não px) porque aqui não há
// coluna animada: o grid preenche exatamente o card, sem scroll horizontal e
// sem espaço sobrando.
const GRID_TEMPLATE_COLUMNS = "3fr 2fr 2fr";

// Célula de valor do padrão (tabela-padrao) — só acrescenta a remoção do
// divisor da última coluna, que aqui é a "Qtd. Ligações".
const VALOR_CELL_CLASS = `${TABELA_VALOR_CELL_CLASS} last:border-r-0`;

export function TmaTable({ linhas, headerButton, thresholdConfig, comDetalhe = true }: TmaTableProps) {
  const [operadorAberto, setOperadorAberto] = useState<TmaLinha | null>(null);
  // Atendimentos do operador aberto, buscados ao abrir o modal
  // (getAtendimentosOperadorTmaAction) — null = carregando. Antes vinham os
  // da equipe inteira (com telefone) no payload da página e a cada polling.
  const [atendimentos, setAtendimentos] = useState<AtendimentoTma[] | null>(null);
  const [erroAtendimentos, setErroAtendimentos] = useState(false);
  // Abrir outro operador antes da resposta chegar: descarta a resposta velha.
  const aberturaRef = useRef(0);

  function abrirDetalhe(linha: TmaLinha) {
    const abertura = ++aberturaRef.current;
    setOperadorAberto(linha);
    setAtendimentos(null);
    setErroAtendimentos(false);
    getAtendimentosOperadorTmaAction(linha.operatorEmail)
      .then((r) => {
        if (abertura !== aberturaRef.current) return;
        if (r.success) setAtendimentos(r.atendimentos);
        else setErroAtendimentos(true);
      })
      .catch((err: unknown) => {
        if (abertura !== aberturaRef.current || handleStaleActionError(err)) return;
        setErroAtendimentos(true);
        console.error("[TmaTable] erro ao buscar atendimentos do operador:", err);
      });
  }

  return (
    <>
      {/*
        Cabeçalho com os
        tokens --th-* (.cabecalho-tabela) e hover semântico pela meta
        (data-meta-linha, .pagina-padrao) — mesmo visual da EquipeTable.
      */}
      {/* Semântica de tabela via ARIA (role=table/row/columnheader/rowheader/
          cell) nos mesmos <div> do grid — mesmo padrão da EquipeTable do
          Consolidado: leitor de tela associa cada número ao cabeçalho e ao
          operador. */}
      <div role="table" aria-label="TMA por operador" className="overflow-hidden">
        <div role="row" className="cabecalho-tabela grid gap-0" style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}>
          <div role="columnheader" className={TABELA_HEADER_CELL_CLASS}>
            Operador
            {headerButton}
          </div>
          <div role="columnheader" className={TABELA_HEADER_CELL_CLASS}>TMA</div>
          <div role="columnheader" className={TABELA_HEADER_CELL_ULTIMA_CLASS}>Qtd. Ligações</div>
        </div>

        {linhas.map((linha) => {
          const semDado = linha.qtdAtendimentos === 0 || linha.tmaSegundos === null;
          const ruim = !semDado && linha.status === "danger";

          // Mesma regra da EquipeTable (Consolidado): linha sem dado não tem
          // detalhamento pra mostrar, então não é clicável nem reage ao hover.
          // Sem modal (cópia oculta do PNG), a linha também não é clicável.
          const clicavel = !semDado && comDetalhe;

          // Hover de linha clicável (igual à EquipeTable): desliza 2px +
          // borda esquerda na cor da meta; o fundo vem do hover semântico.
          const hoverClass = clicavel
            ? cn(
                "hover:translate-x-0.5",
                ruim ? "hover:border-l-[var(--danger)]" : "hover:border-l-[var(--success)]",
              )
            : "hover:bg-transparent hover:border-l-transparent hover:translate-x-0";

          return (
            // Clique do mouse em qualquer parte da linha. O teclado usa o
            // <button> do nome (abaixo): Enter/Espaço nele geram um click que
            // sobe até aqui — a linha não pode ser role=button e row ao mesmo
            // tempo (mesmo padrão da EquipeTable do Consolidado).
            <div
              key={linha.operatorEmail}
              role="row"
              onClick={clicavel ? () => abrirDetalhe(linha) : undefined}
              data-sem-dados={semDado ? "true" : undefined}
              data-meta-linha={clicavel ? (ruim ? "abaixo" : "dentro") : undefined}
              className={cn(
                TABELA_LINHA_CLASS,
                "border-l-2 border-l-transparent transition-[background-color,border-color,transform] duration-200 ease-out",
                clicavel && "cursor-pointer",
                hoverClass,
              )}
              style={{
                background: fundoLinhaRuim(ruim),
                // Sem opacidade na linha sem dado (antes 0.65): sobre o texto
                // muted, derrubava o contraste abaixo de 4,5:1 no tema claro —
                // mesma remoção feita na EquipeTable do Consolidado. A linha
                // continua "apagada" pela cor muted (corNomeOperador) e pelo "—".
                gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
              }}
            >
              <div
                role="rowheader"
                className={cn(TABELA_NOME_CELL_CLASS, "no-underline")}
                style={{
                  color: corNomeOperador({ semDado, ruim }),
                  textDecoration: "none",
                }}
              >
                {/* O <button> não tem onClick próprio: existe só pro
                    foco/teclado, e o click dele sobe até a linha (sem
                    stopPropagation, senão o dialog não abriria pelo teclado). */}
                {clicavel ? (
                  <button type="button" aria-haspopup="dialog" className="block w-full min-w-0 cursor-pointer truncate">
                    {linha.nomeExibicao}
                  </button>
                ) : (
                  linha.nomeExibicao
                )}
              </div>
              <div role="cell" className={VALOR_CELL_CLASS}>
                <span className="inline-flex items-center justify-center gap-1.5">
                  {semDado ? (
                    <ValorSemDado />
                  ) : (
                    // Sem bolinha — mesmo visual da Tx Retenção da
                    // EquipeTable (Consolidado): só o texto colorido.
                    <span
                      style={{
                        color: ruim ? "var(--danger)" : "var(--success)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatKpiValue(linha.tmaSegundos, "time")}
                    </span>
                  )}
                </span>
              </div>
              <div role="cell" className={VALOR_CELL_CLASS}>
                {linha.qtdAtendimentos}
              </div>
            </div>
          );
        })}
      </div>

      {comDetalhe && (
        <TmaDetalheDialog
          operador={operadorAberto}
          atendimentos={atendimentos}
          erroAtendimentos={erroAtendimentos}
          thresholdConfig={thresholdConfig}
          onOpenChange={(open) => {
            if (!open) {
              aberturaRef.current++;
              setOperadorAberto(null);
            }
          }}
        />
      )}
    </>
  );
}
