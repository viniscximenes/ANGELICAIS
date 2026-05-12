"use client";

import { forwardRef } from "react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
}

const META_TX = 0.6;
const COLS = "grid-cols-[2.2fr_1fr_1fr_1fr_1fr]";

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function formatTx(tx: number | null): string {
  if (tx === null) return "—";
  return `${(tx * 100).toFixed(1)}%`;
}

function getNumberColor(value: number): string {
  if (value === 0) return "var(--muted-foreground)";
  return "color-mix(in oklch, var(--foreground) 75%, transparent)";
}

function getTxBg(tx: number | null): string {
  if (tx === null) return "transparent";
  if (tx >= META_TX) {
    const ratio = Math.min((tx - META_TX) / (1 - META_TX), 1);
    const alpha = 0.06 + ratio * 0.12;
    return `color-mix(in oklch, var(--success) ${alpha * 100}%, transparent)`;
  }
  const ratio = Math.min((META_TX - tx) / META_TX, 1);
  const alpha = 0.06 + ratio * 0.12;
  return `color-mix(in oklch, var(--danger) ${alpha * 100}%, transparent)`;
}

function getTxTextColor(tx: number | null): string {
  if (tx === null) return "var(--muted-foreground)";
  if (tx >= META_TX) return "var(--success)";
  return "var(--danger)";
}

function getTxDotColor(tx: number | null): string | null {
  if (tx === null) return null;
  if (tx >= META_TX) return "var(--success)";
  return "var(--danger)";
}

export const EquipeTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function EquipeTable({ operadores, equipe }, ref) {
    return (
      <div
        ref={ref}
        data-equipe-table
        className="elevation-1 rounded-xl p-3"
      >
        {/* Cabeçalho */}
        <div
          className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] gap-0 overflow-hidden rounded-md"
          style={{ background: "var(--elevation-2-bg)" }}
        >
          <span
            className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Operador
          </span>
          <span
            className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Retidos
          </span>
          <span
            className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Cancelados
          </span>
          <span
            className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Pedidos
          </span>
          <span
            className="ds-mono-sm px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Tx Retenção
          </span>
        </div>

        {/* Linhas de operadores */}
        <div>
          {operadores.map((op) => {
            const dotColor = getTxDotColor(op.txRetencao);
            const isBelow =
              op.txRetencao !== null && op.txRetencao < META_TX;
            const isAbove =
              op.txRetencao !== null && op.txRetencao >= META_TX;

            let rowBackground = "transparent";
            if (isBelow) {
              rowBackground =
                "linear-gradient(to left, color-mix(in oklch, var(--danger) 18%, transparent) 0%, color-mix(in oklch, var(--danger) 12%, transparent) 40%, transparent 85%)";
            } else if (isAbove) {
              rowBackground =
                "linear-gradient(to left, color-mix(in oklch, var(--success) 18%, transparent) 0%, color-mix(in oklch, var(--success) 12%, transparent) 40%, transparent 85%)";
            }
            return (
              <div
                key={op.email}
                className={`grid ${COLS} items-center gap-0 py-1 transition-colors hover:bg-[var(--elevation-2-bg)]`}
                style={{ background: rowBackground }}
              >
                <span className="ds-mono-sm text-muted-foreground border-r border-[var(--border)] px-1.5">
                  {formatOperatorLabel(op.email)}
                </span>
                <span
                  className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
                  style={{ color: getNumberColor(op.retidos) }}
                >
                  {op.retidos}
                </span>
                <span
                  className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
                  style={{ color: getNumberColor(op.cancelados) }}
                >
                  {op.cancelados}
                </span>
                <span
                  className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
                  style={{ color: getNumberColor(op.pedidos) }}
                >
                  {op.pedidos}
                </span>
                <span
                  className="ds-mono flex items-center justify-end gap-2 px-1.5 font-medium"
                  style={{
                    background: "transparent",
                    color: getTxTextColor(op.txRetencao),
                  }}
                >
                  {formatTx(op.txRetencao)}
                  {dotColor && (
                    <span
                      aria-hidden="true"
                      className="inline-block rounded-full"
                      style={{
                        width: "7px",
                        height: "7px",
                        background: dotColor,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Linha Equipe — neutra, label em muted, números em branco */}
        <div
          className="mt-2 overflow-hidden rounded-md border border-[var(--border)]"
          style={{ background: "var(--elevation-2-bg)" }}
        >
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] gap-0 py-1.5">
            <span
              className="ds-mono-sm flex items-center border-r border-[var(--border)] px-1.5 font-semibold tracking-[0.15em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              Equipe
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {equipe.retidos}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {equipe.cancelados}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {equipe.pedidos}
            </span>
            <span
              className="ds-mono flex items-center justify-end gap-2 px-1.5 font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {formatTx(equipe.txRetencao)}
              {getTxDotColor(equipe.txRetencao) && (
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full"
                  style={{
                    width: "7px",
                    height: "7px",
                    background: getTxDotColor(equipe.txRetencao)!,
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
          </div>
        </div>
      </div>
    );
  },
);
