"use client";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";

const META_INDISP = 14.5;

interface IndispEquipeTableProps {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}

type IndispStatus = "above" | "below" | "neutral";

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function getIndispStatus(percent: number | null): IndispStatus {
  if (percent === null) return "neutral";
  if (percent <= META_INDISP) return "above";
  return "below";
}

function getIndispColor(status: IndispStatus): string {
  if (status === "above") return "var(--success)";
  if (status === "below") return "var(--danger)";
  return "var(--muted-foreground)";
}

function getRowBackground(status: IndispStatus): string {
  if (status === "above") {
    return "linear-gradient(to left, color-mix(in oklch, var(--success) 18%, transparent) 0%, color-mix(in oklch, var(--success) 12%, transparent) 40%, transparent 85%)";
  }
  if (status === "below") {
    return "linear-gradient(to left, color-mix(in oklch, var(--danger) 18%, transparent) 0%, color-mix(in oklch, var(--danger) 12%, transparent) 40%, transparent 85%)";
  }
  return "transparent";
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

export function IndispEquipeTable({
  operadoresIndisp,
  operadoresPausa,
}: IndispEquipeTableProps) {
  const pausaMap = new Map(operadoresPausa.map((p) => [p.email, p]));

  return (
    <div className="elevation-1 rounded-xl p-3" data-indisp-equipe-table>
      <div
        className="grid grid-cols-[2fr_0.9fr_0.9fr_0.9fr_1fr] gap-0 overflow-hidden rounded-md"
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
          Tempo indisp.
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          NR17
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Particular
        </span>
        <span
          className="ds-mono-sm px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Indisp %
        </span>
      </div>

      {operadoresIndisp.map((op) => {
        const status = getIndispStatus(op.indispPercent);
        const rowBg = getRowBackground(status);
        const indispColor = getIndispColor(status);
        const dotColor = status !== "neutral" ? indispColor : null;

        const pausa = pausaMap.get(op.email);

        return (
          <div
            key={op.email}
            className="grid grid-cols-[2fr_0.9fr_0.9fr_0.9fr_1fr] gap-0 py-1"
            style={{ background: rowBg }}
          >
            <span className="ds-mono-sm text-muted-foreground flex items-center border-r border-[var(--border)] px-1.5">
              {formatOperatorLabel(op.email)}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color:
                  pausa?.tempoIndisponivel &&
                  pausa.tempoIndisponivel !== "00:00:00"
                    ? "color-mix(in oklch, var(--foreground) 75%, transparent)"
                    : "var(--muted-foreground)",
              }}
            >
              {pausa?.tempoIndisponivel ?? "00:00:00"}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color:
                  pausa?.nr17 && pausa.nr17 !== "00:00:00"
                    ? "color-mix(in oklch, var(--foreground) 75%, transparent)"
                    : "var(--muted-foreground)",
              }}
            >
              {pausa?.nr17 ?? "00:00:00"}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color:
                  pausa?.pausaParticular &&
                  pausa.pausaParticular !== "00:00:00"
                    ? "color-mix(in oklch, var(--foreground) 75%, transparent)"
                    : "var(--muted-foreground)",
              }}
            >
              {pausa?.pausaParticular ?? "00:00:00"}
            </span>
            <span
              className="ds-mono flex items-center justify-end gap-2 px-1.5 font-medium"
              style={{ color: indispColor }}
            >
              {formatPercent(op.indispPercent)}
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
  );
}
