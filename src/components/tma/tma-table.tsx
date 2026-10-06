"use client";

import { useState } from "react";
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
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { TmaDetalheDialog } from "./tma-detalhe-dialog-lazy";

export type TmaLinha = OperadorTma & {
  nomeExibicao: string;
};

interface TmaTableProps {
  linhas: TmaLinha[];
  atendimentosPorOperador: Record<string, AtendimentoTma[]>;
  headerButton?: ReactNode;
  /** Repassado até TmaDetalheDialog (gráfico "TMA por Hora" do operador) — ver comentário em gestor-tma-section.tsx. */
  thresholdConfig: TmaThresholdConfig;
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

export function TmaTable({ linhas, atendimentosPorOperador, headerButton, thresholdConfig }: TmaTableProps) {
  const [operadorAberto, setOperadorAberto] = useState<TmaLinha | null>(null);

  return (
    <>
      {/*
        data-tma-table: gancho neutro (análogo a data-equipe-table, sem
        depender das regras de legado do tema claro). Cabeçalho com os
        tokens --th-* (.cabecalho-tabela) e hover semântico pela meta
        (data-meta-linha, .pagina-padrao) — mesmo visual da EquipeTable.
      */}
      <div data-tma-table className="overflow-hidden">
        <div className="cabecalho-tabela grid gap-0" style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}>
          <div className={TABELA_HEADER_CELL_CLASS}>
            Operador
            {headerButton}
          </div>
          <div className={TABELA_HEADER_CELL_CLASS}>TMA</div>
          <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>Qtd. Ligações</div>
        </div>

        {linhas.map((linha) => {
          const semDado = linha.qtdAtendimentos === 0 || linha.tmaSegundos === null;
          const ruim = !semDado && linha.status === "danger";

          // Mesma regra da EquipeTable (Consolidado): linha sem dado não tem
          // detalhamento pra mostrar, então não é clicável nem reage ao hover.
          const clicavel = !semDado;

          // Hover de linha clicável (igual à EquipeTable): desliza 2px +
          // borda esquerda na cor da meta; o fundo vem do hover semântico.
          const hoverClass = clicavel
            ? cn(
                "hover:translate-x-0.5",
                ruim ? "hover:border-l-[var(--danger)]" : "hover:border-l-[var(--success)]",
              )
            : "hover:bg-transparent hover:border-l-transparent hover:translate-x-0";

          return (
            <div
              key={linha.operatorEmail}
              onClick={clicavel ? () => setOperadorAberto(linha) : undefined}
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
                opacity: semDado ? 0.65 : 1,
                gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
              }}
            >
              <div
                className={cn(TABELA_NOME_CELL_CLASS, "no-underline")}
                style={{
                  color: corNomeOperador({ semDado, ruim }),
                  textDecoration: "none",
                }}
              >
                {linha.nomeExibicao}
              </div>
              <div className={VALOR_CELL_CLASS}>
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
              <div className={VALOR_CELL_CLASS}>
                {linha.qtdAtendimentos}
              </div>
            </div>
          );
        })}
      </div>

      <TmaDetalheDialog
        operador={operadorAberto}
        atendimentos={
          operadorAberto ? atendimentosPorOperador[operadorAberto.operatorEmail] ?? [] : []
        }
        thresholdConfig={thresholdConfig}
        onOpenChange={(open) => {
          if (!open) setOperadorAberto(null);
        }}
      />
    </>
  );
}
