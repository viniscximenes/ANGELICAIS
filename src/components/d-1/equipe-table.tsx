"use client";

import { forwardRef } from "react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  variant?: "screen" | "excel";
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
  function EquipeTable({ operadores, equipe, variant = "screen" }, ref) {
    if (variant === "excel") {
      return (
        <ExcelTable ref={ref} operadores={operadores} equipe={equipe} />
      );
    }
    return <ScreenTable ref={ref} operadores={operadores} equipe={equipe} />;
  },
);

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const COL_DIVIDER_SCREEN: React.CSSProperties = {
  borderRight: "1px solid var(--row-border)",
};

const ScreenTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ScreenTable({ operadores, equipe }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao);

    return (
      <div
        ref={ref}
        data-equipe-table
        className="elevation-1 overflow-hidden rounded-xl"
      >
        <div
          className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-0 border-b px-0 py-2 font-semibold tracking-wider uppercase"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="col-span-3 px-3" style={COL_DIVIDER_SCREEN}>
            Operador
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={COL_DIVIDER_SCREEN}
          >
            Retidos
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={COL_DIVIDER_SCREEN}
          >
            Cancelados
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={COL_DIVIDER_SCREEN}
          >
            Pedidos
          </div>
          <div className="col-span-3 px-3 text-right">Tx Retenção</div>
        </div>

        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao);
          const belowMeta = !semAtendimentos && !meetsM;

          return (
            <div
              key={op.email}
              className="grid grid-cols-12 items-center gap-0 px-0 py-1.5"
              style={{
                background: belowMeta
                  ? "color-mix(in oklch, var(--danger) 7%, transparent)"
                  : "transparent",
                borderBottom: isLast ? "none" : "1px solid var(--row-border)",
                opacity: semAtendimentos ? 0.35 : 1,
              }}
            >
              <div
                className="ds-body col-span-3 truncate px-3"
                style={{
                  ...COL_DIVIDER_SCREEN,
                  color: semAtendimentos
                    ? "var(--muted-foreground)"
                    : belowMeta
                      ? "var(--danger)"
                      : "var(--foreground)",
                  fontWeight: belowMeta ? 500 : 400,
                }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 text-right"
                style={{
                  ...COL_DIVIDER_SCREEN,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {op.retidos}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 text-right"
                style={{
                  ...COL_DIVIDER_SCREEN,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {op.cancelados}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 text-right"
                style={{
                  ...COL_DIVIDER_SCREEN,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {op.pedidos}
              </div>
              <div className="ds-mono-sm col-span-3 flex items-center justify-end gap-1.5 px-3">
                {semAtendimentos ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>
                    <span
                      style={{
                        color: belowMeta
                          ? "var(--danger)"
                          : "var(--success)",
                        fontWeight: 500,
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

        <div
          className="ds-body grid grid-cols-12 items-center gap-0 px-0 py-2"
          style={{
            borderTop: "1px solid var(--border)",
            fontWeight: 500,
          }}
        >
          <div className="col-span-3 px-3" style={COL_DIVIDER_SCREEN}>
            EQUIPE
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{
              ...COL_DIVIDER_SCREEN,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {equipe.retidos}
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{
              ...COL_DIVIDER_SCREEN,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {equipe.cancelados}
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{
              ...COL_DIVIDER_SCREEN,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {equipe.pedidos}
          </div>
          <div className="col-span-3 flex items-center justify-end gap-1.5 px-3">
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
      </div>
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
   ──────────────────────────────────────────────────────────────────── */

const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";
const MONO_STACK = "'Consolas', 'Courier New', monospace";

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
};

const EXCEL_TEXT_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "left",
};

const EXCEL_NUM_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: MONO_STACK,
  fontSize: "12px",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const ExcelTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ExcelTable({ operadores, equipe }, ref) {
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
          <div
            style={{
              ...EXCEL_HEADER_CELL,
              ...EXCEL_HEADER_DIVIDER,
              textAlign: "right",
            }}
          >
            Retidos
          </div>
          <div
            style={{
              ...EXCEL_HEADER_CELL,
              ...EXCEL_HEADER_DIVIDER,
              textAlign: "right",
            }}
          >
            Cancelados
          </div>
          <div
            style={{
              ...EXCEL_HEADER_CELL,
              ...EXCEL_HEADER_DIVIDER,
              textAlign: "right",
            }}
          >
            Pedidos
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, textAlign: "right" }}>
            Tx Retenção
          </div>
        </div>

        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao);
          const belowMeta = !semAtendimentos && !meetsM;

          const rowBg = belowMeta ? "#fff5f5" : "#ffffff";
          const nameColor = belowMeta ? "#c62828" : "#000000";
          const txColor = semAtendimentos
            ? "#000000"
            : belowMeta
              ? "#c62828"
              : "#2e7d32";

          return (
            <div
              key={op.email}
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
                  color: nameColor,
                  fontWeight: belowMeta ? 600 : 400,
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
                  color: "#000000",
                }}
              >
                {op.retidos}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: "#000000",
                }}
              >
                {op.cancelados}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: "#000000",
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
                  justifyContent: "flex-end",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr 2fr 2fr 3fr",
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
            }}
          >
            {equipe.retidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
            }}
          >
            {equipe.cancelados}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
            }}
          >
            {equipe.pedidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              fontWeight: 600,
              color:
                equipe.txRetencao === null
                  ? "#000000"
                  : equipeMeets
                    ? "#2e7d32"
                    : "#c62828",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
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
                    background: equipeMeets ? "#2e7d32" : "#c62828",
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);
