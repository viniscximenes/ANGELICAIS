"use client";

import { forwardRef } from "react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  variant?: "screen" | "excel";
  /** Esconde a linha de totais (EQUIPE) — usado na busca de 1 operador. */
  hideTotais?: boolean;
  headerButton?: React.ReactNode;
}

const META_TX = 0.6;

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function formatTx(tx: number | null): string {
  if (tx === null) return "—";
  return `${(tx * 100).toFixed(1)}%`;
}

function meetsMeta(tx: number): boolean {
  return Math.round(tx * 1000) >= Math.round(META_TX * 1000);
}

export const EquipeTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function EquipeTable(
    { operadores, equipe, variant = "screen", hideTotais, headerButton },
    ref,
  ) {
    if (variant === "excel") {
      return (
        <ExcelTable
          ref={ref}
          operadores={operadores}
          equipe={equipe}
          hideTotais={hideTotais}
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
      />
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const ScreenTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ScreenTable({ operadores, equipe, hideTotais, headerButton }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao);

    return (
      <div
        ref={ref}
        data-equipe-table
        className="elevation-1 overflow-hidden rounded-xl border border-border/80"
      >
        {/* Cabeçalho Estilo Planilha */}
        <div
          className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-0 font-semibold tracking-wider uppercase bg-muted/40"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="col-span-3 px-3 py-2.5 text-center border-r border-border/50 flex items-center justify-center gap-1.5">
            <span>Operador</span>
            {headerButton}
          </div>
          <div className="col-span-2 px-3 py-2.5 text-center border-r border-border/50">
            Retidos
          </div>
          <div className="col-span-2 px-3 py-2.5 text-center border-r border-border/50">
            Cancelados
          </div>
          <div className="col-span-2 px-3 py-2.5 text-center border-r border-border/50">
            Pedidos
          </div>
          <div className="col-span-3 px-3 py-2.5 text-center">
            Tx Retenção
          </div>
        </div>

        {/* Linhas de Operadores */}
        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;

          return (
            <div
              key={key}
              className="grid grid-cols-12 items-center gap-0"
              style={{
                background: belowMeta
                  ? "color-mix(in oklch, var(--danger) 5%, transparent)"
                  : "transparent",
                borderBottom: isLast && hideTotais ? "none" : "1px solid var(--border)/40",
                opacity: semAtendimentos ? 0.4 : 1,
              }}
            >
              <div
                className="ds-body col-span-3 truncate px-3 py-2 text-center border-r border-border/30 font-medium"
                style={{
                  color: semAtendimentos
                    ? "var(--muted-foreground)"
                    : belowMeta
                      ? "var(--danger)"
                      : "var(--foreground)",
                }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 py-2 text-center border-r border-border/30"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.retidos}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 py-2 text-center border-r border-border/30"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.cancelados}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 py-2 text-center border-r border-border/30"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {op.pedidos}
              </div>
              <div className="ds-mono-sm col-span-3 flex items-center justify-center gap-1.5 px-3 py-2">
                {semAtendimentos ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>
                    <span
                      style={{
                        color: belowMeta
                          ? "var(--danger)"
                          : "var(--success)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatTx(op.txRetencao)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        background: belowMeta
                          ? "var(--danger)"
                          : "var(--success)",
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Linha de Totais (Equipe) - Fechamento Contábil / Excel */}
        {!hideTotais && (
          <div
            className="ds-body grid grid-cols-12 items-center gap-0 bg-muted/20 font-bold"
            style={{
              borderTop: "2px solid var(--border)",
              borderBottom: "2px double var(--border)",
            }}
          >
            <div className="col-span-3 px-3 py-2.5 text-center border-r border-border/40 text-foreground">
              EQUIPE
            </div>
            <div
              className="col-span-2 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.retidos}
            </div>
            <div
              className="col-span-2 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.cancelados}
            </div>
            <div
              className="col-span-2 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.pedidos}
            </div>
            <div className="col-span-3 flex items-center justify-center gap-1.5 px-3 py-2.5">
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
  function ExcelTable({ operadores, equipe, hideTotais }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao);

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
            gridTemplateColumns: "3fr 2fr 2fr 2fr 3fr",
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
          <div style={EXCEL_HEADER_CELL}>Tx Retenção</div>
        </div>

        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;

          // TX < 60%: a LINHA INTEIRA fica vermelho claro (alerta). Os números
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
                gridTemplateColumns: "3fr 2fr 2fr 2fr 3fr",
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
            </div>
          );
        })}

        {!hideTotais && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr 2fr 2fr 3fr",
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
        </div>
        )}
      </div>
    );
  },
);
