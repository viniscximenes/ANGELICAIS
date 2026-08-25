"use client";

import { forwardRef } from "react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { formatBRL } from "@/lib/rv/format-money";
import { cn } from "@/lib/utils";
import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemantico,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  variant?: "screen" | "excel";
  /** Esconde a linha de totais (EQUIPE) — usado na busca de 1 operador. */
  hideTotais?: boolean;
  headerButton?: React.ReactNode;
  /**
   * Meta de TX (fração 0-1, ex: 0.6 = 60%) usada para colorir verde/vermelho.
   * Opcional — quando omitida, mantém o comportamento histórico (60%) usado
   * pelo D-1 do operador. O painel do gestor passa a meta configurável dele.
   */
  metaTx?: number;
  /**
   * Coluna extra opcional (RV Diário), gated pelo toggle da tela.
   * Off (default): grid idêntico ao atual, sem nenhuma mudança de DOM/classes
   * nas 5 colunas existentes. Só a variante "screen" suporta — a PNG (excel)
   * não ganha essa coluna.
   */
  showRvDiario?: boolean;
}

function formatRv(rv: number | null | undefined): string {
  if (rv === null || rv === undefined) return "—";
  return formatBRL(rv);
}

const META_TX_PADRAO = 0.6;

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function formatTx(tx: number | null): string {
  if (tx === null) return "—";
  return `${(tx * 100).toFixed(1)}%`;
}

function meetsMeta(tx: number, meta: number = META_TX_PADRAO): boolean {
  return Math.round(tx * 1000) >= Math.round(meta * 1000);
}

export const EquipeTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function EquipeTable(
    { operadores, equipe, variant = "screen", hideTotais, headerButton, metaTx, showRvDiario },
    ref,
  ) {
    if (variant === "excel") {
      return (
        <ExcelTable
          ref={ref}
          operadores={operadores}
          equipe={equipe}
          hideTotais={hideTotais}
          metaTx={metaTx}
          showRvDiario={showRvDiario}
        />
      );
    }
    return (
      <ScreenTable
        ref={ref}
        operadores={operadores}
        equipe={equipe}
        hideTotais={hideTotais}
        headerButton={headerButton}
        metaTx={metaTx}
        showRvDiario={showRvDiario}
      />
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const ScreenTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ScreenTable(
    { operadores, equipe, hideTotais, headerButton, metaTx, showRvDiario },
    ref,
  ) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao, metaTx);

    return (
      <div ref={ref} data-equipe-table className={TABELA_CONTAINER_CLASS}>
        {/* Cabeçalho Estilo Planilha */}
        <div
          className={TABELA_HEADER_CLASS}
          style={{
            ...TABELA_HEADER_BORDA,
            gridTemplateColumns: showRvDiario
              ? "3fr 2fr 2fr 2fr 3fr 3fr"
              : "3fr 2fr 2fr 2fr 3fr",
          }}
        >
          <div className={cn(TABELA_HEADER_CELL_CLASS, "flex items-center justify-center gap-1.5")}>
            <span>Operador</span>
            {headerButton}
          </div>
          <div className={TABELA_HEADER_CELL_CLASS}>Retidos</div>
          <div className={TABELA_HEADER_CELL_CLASS}>Cancelados</div>
          <div className={TABELA_HEADER_CELL_CLASS}>Pedidos</div>
          <div
            className={cn(
              "px-3 py-2.5 text-center",
              showRvDiario && "border-r border-border/50",
            )}
          >
            Tx Retenção
          </div>
          {showRvDiario && (
            <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>RV Diário</div>
          )}
        </div>

        {/* Linhas de Operadores */}
        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao, metaTx);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;

          return (
            <div
              key={key}
              className={TABELA_LINHA_CLASS}
              style={{
                background: fundoLinhaRuim(belowMeta),
                borderBottom: isLast && hideTotais ? "none" : "1px solid var(--border)/40",
                opacity: semAtendimentos ? 0.65 : 1,
                gridTemplateColumns: showRvDiario
                  ? "3fr 2fr 2fr 2fr 3fr 3fr"
                  : "3fr 2fr 2fr 2fr 3fr",
              }}
            >
              <div
                className={TABELA_NOME_CELL_CLASS}
                style={{ color: corNomeOperador({ semDado: semAtendimentos, ruim: belowMeta }) }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.retidos}
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.cancelados}
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.pedidos}
              </div>
              <div
                className={cn(
                  "ds-mono-sm flex items-center justify-center gap-1.5 px-3 py-2",
                  showRvDiario && "border-r border-border/30",
                )}
              >
                {semAtendimentos ? (
                  <ValorSemDado />
                ) : (
                  <ValorSemantico ruim={belowMeta}>{formatTx(op.txRetencao)}</ValorSemantico>
                )}
              </div>
              {showRvDiario && (
                <div
                  className="ds-mono-sm px-3 py-2 text-center"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatRv(op.rvDiario)}
                </div>
              )}
            </div>
          );
        })}

        {/* Linha de Totais (Equipe) - Fechamento Contábil / Excel */}
        {!hideTotais && (
          <div
            className="ds-body grid items-center gap-0 bg-muted/20 font-bold"
            style={{
              borderTop: "2px solid var(--border)",
              borderBottom: "2px double var(--border)",
              gridTemplateColumns: showRvDiario
                ? "3fr 2fr 2fr 2fr 3fr 3fr"
                : "3fr 2fr 2fr 2fr 3fr",
            }}
          >
            <div className="px-3 py-2.5 text-center border-r border-border/40 text-foreground">
              EQUIPE
            </div>
            <div
              className="px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.retidos}
            </div>
            <div
              className="px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.cancelados}
            </div>
            <div
              className="px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.pedidos}
            </div>
            <div
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-2.5",
                showRvDiario && "border-r border-border/40",
              )}
            >
              {equipe.txRetencao === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <span
                    style={{
                      color: equipeMeets ? "var(--success)" : "var(--danger)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTx(equipe.txRetencao)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: equipeMeets
                        ? "var(--success)"
                        : "var(--danger)",
                    }}
                  />
                </>
              )}
            </div>
            {showRvDiario && (
              <div
                className="px-3 py-2.5 text-center"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatRv(equipe.rvDiario)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
   ──────────────────────────────────────────────────────────────────── */

// Tudo no PNG usa Segoe UI — inclusive os números (antes Consolas/monospace).
const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";

// Cores das colunas no PNG (variant excel) — legíveis sobre fundo branco.
const EXCEL_GREEN = "#2e7d32"; // retidos / tx >= 60%
const EXCEL_RED = "#c62828"; // cancelados / tx < 60%
const EXCEL_AMBER = "#ed6c02"; // pedidos (âmbar, contrasta no branco)
const EXCEL_RED_BG = "#ffe5e5"; // fundo de alerta da célula de TX < 60%
const EXCEL_NEUTRAL = "#000000"; // nome do operador / TX nula

const EXCEL_COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #d0d0d0",
};

const EXCEL_HEADER_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #4a7ba6",
};

const EXCEL_HEADER_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#ffffff",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const EXCEL_TEXT_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "center",
};

const EXCEL_NUM_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
};

const ExcelTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ExcelTable({ operadores, equipe, hideTotais, metaTx, showRvDiario }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao, metaTx);
    const gridCols = showRvDiario
      ? "3fr 2fr 2fr 2fr 3fr 3fr"
      : "3fr 2fr 2fr 2fr 3fr";

    return (
      <div
        ref={ref}
        data-equipe-table
        style={{
          background: "#ffffff",
          color: "#000000",
          border: "1px solid #c0c0c0",
          boxShadow: "none",
          fontFamily: SANS_STACK,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            background: "#1f4e78",
            borderBottom: "1px solid #1f4e78",
          }}
        >
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Operador
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Retidos
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Cancelados
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Pedidos
          </div>
          <div
            style={
              showRvDiario
                ? { ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }
                : EXCEL_HEADER_CELL
            }
          >
            Tx Retenção
          </div>
          {showRvDiario && (
            <div style={EXCEL_HEADER_CELL}>RV Diário</div>
          )}
        </div>

        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao, metaTx);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;

          // TX < meta: a LINHA INTEIRA fica vermelho claro (alerta). Os números
          // mantêm a cor por coluna; o nome fica preto para legibilidade.
          const rowBg = belowMeta ? EXCEL_RED_BG : "#ffffff";
          const txColor = semAtendimentos
            ? EXCEL_NEUTRAL
            : belowMeta
              ? EXCEL_RED
              : EXCEL_GREEN;

          return (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                background: rowBg,
                borderBottom: isLast ? "none" : "1px solid #d0d0d0",
              }}
            >
              <div
                style={{
                  ...EXCEL_TEXT_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_NEUTRAL,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_GREEN,
                }}
              >
                {op.retidos}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_RED,
                }}
              >
                {op.cancelados}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_AMBER,
                }}
              >
                {op.pedidos}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...(showRvDiario ? EXCEL_COL_DIVIDER : null),
                  color: txColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {semAtendimentos ? (
                  <span>—</span>
                ) : (
                  <>
                    <span>{formatTx(op.txRetencao)}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: txColor,
                      }}
                    />
                  </>
                )}
              </div>
              {showRvDiario && (
                <div
                  style={{
                    ...EXCEL_NUM_CELL,
                    color: EXCEL_NEUTRAL,
                  }}
                >
                  {formatRv(op.rvDiario)}
                </div>
              )}
            </div>
          );
        })}

        {!hideTotais && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            // Linha de total SEMPRE cinza — nunca pinta de vermelho, mesmo com
            // TX < 60% (o alerta vermelho vale só para linhas de operador).
            background: "#f0f0f0",
            borderTop: "2px solid #808080",
            fontWeight: 600,
            color: "#000000",
          }}
        >
          <div
            style={{
              ...EXCEL_TEXT_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            EQUIPE
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.retidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.cancelados}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.pedidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...(showRvDiario ? EXCEL_COL_DIVIDER : null),
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {equipe.txRetencao === null ? (
              <span>—</span>
            ) : (
              <>
                <span>{formatTx(equipe.txRetencao)}</span>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: equipeMeets ? EXCEL_GREEN : EXCEL_RED,
                  }}
                />
              </>
            )}
          </div>
          {showRvDiario && (
            <div
              style={{
                ...EXCEL_NUM_CELL,
                fontWeight: 600,
                color: EXCEL_NEUTRAL,
              }}
            >
              {formatRv(equipe.rvDiario)}
            </div>
          )}
        </div>
        )}
      </div>
    );
  },
);
