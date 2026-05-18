"use client";

import { forwardRef } from "react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
}

const META_TX = 0.6;

const COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid var(--row-border)",
};

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
  function EquipeTable({ operadores, equipe }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao);

    return (
      <div
        ref={ref}
        data-equipe-table
        className="elevation-1 overflow-hidden rounded-xl"
      >
        {/* Header */}
        <div
          className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-0 border-b px-0 py-2 font-semibold tracking-wider uppercase"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="col-span-3 px-3" style={COL_DIVIDER}>
            Operador
          </div>
          <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
            Retidos
          </div>
          <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
            Cancelados
          </div>
          <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
            Pedidos
          </div>
          <div className="col-span-3 px-3 text-right">Tx Retenção</div>
        </div>

        {/* Linhas de operadores */}
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
                  ...COL_DIVIDER,
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
                style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
              >
                {op.retidos}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 text-right"
                style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
              >
                {op.cancelados}
              </div>
              <div
                className="ds-mono-sm col-span-2 px-3 text-right"
                style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
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

        {/* Linha Equipe (rodapé) */}
        <div
          className="ds-body grid grid-cols-12 items-center gap-0 px-0 py-2"
          style={{
            borderTop: "1px solid var(--border)",
            fontWeight: 500,
          }}
        >
          <div className="col-span-3 px-3" style={COL_DIVIDER}>
            EQUIPE
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
          >
            {equipe.retidos}
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
          >
            {equipe.cancelados}
          </div>
          <div
            className="col-span-2 px-3 text-right"
            style={{ ...COL_DIVIDER, fontVariantNumeric: "tabular-nums" }}
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
