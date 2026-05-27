"use client";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";

const META_INDISP = 14.5;

interface IndispEquipeTableProps {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
  variant?: "screen" | "excel";
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

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

export function IndispEquipeTable({
  operadoresIndisp,
  operadoresPausa,
  variant = "screen",
}: IndispEquipeTableProps) {
  if (variant === "excel") {
    return (
      <ExcelTable
        operadoresIndisp={operadoresIndisp}
        operadoresPausa={operadoresPausa}
      />
    );
  }
  return (
    <ScreenTable
      operadoresIndisp={operadoresIndisp}
      operadoresPausa={operadoresPausa}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site
   ──────────────────────────────────────────────────────────────────── */

function getIndispColorScreen(status: IndispStatus): string {
  if (status === "above") return "var(--success)";
  if (status === "below") return "var(--danger)";
  return "var(--muted-foreground)";
}

function getRowBackgroundScreen(status: IndispStatus): string {
  if (status === "above") {
    return "linear-gradient(to left, color-mix(in oklch, var(--success) 18%, transparent) 0%, color-mix(in oklch, var(--success) 12%, transparent) 40%, transparent 85%)";
  }
  if (status === "below") {
    return "linear-gradient(to left, color-mix(in oklch, var(--danger) 18%, transparent) 0%, color-mix(in oklch, var(--danger) 12%, transparent) 40%, transparent 85%)";
  }
  return "transparent";
}

function ScreenTable({
  operadoresIndisp,
  operadoresPausa,
}: {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}) {
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
        const rowBg = getRowBackgroundScreen(status);
        const indispColor = getIndispColorScreen(status);
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
  color: "#000000",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const EXCEL_NUM_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: MONO_STACK,
  fontSize: "12px",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

function ExcelTable({
  operadoresIndisp,
  operadoresPausa,
}: {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}) {
  const pausaMap = new Map(operadoresPausa.map((p) => [p.email, p]));
  const lastIdx = operadoresIndisp.length - 1;
  const gridTemplate = "2fr 0.9fr 0.9fr 0.9fr 1fr";

  return (
    <div
      data-indisp-equipe-table
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
          gridTemplateColumns: gridTemplate,
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
          Tempo indisp.
        </div>
        <div
          style={{
            ...EXCEL_HEADER_CELL,
            ...EXCEL_HEADER_DIVIDER,
            textAlign: "right",
          }}
        >
          NR17
        </div>
        <div
          style={{
            ...EXCEL_HEADER_CELL,
            ...EXCEL_HEADER_DIVIDER,
            textAlign: "right",
          }}
        >
          Particular
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, textAlign: "right" }}>
          Indisp %
        </div>
      </div>

      {operadoresIndisp.map((op, idx) => {
        const status = getIndispStatus(op.indispPercent);
        const pausa = pausaMap.get(op.email);
        const isLast = idx === lastIdx;

        const rowBg = status === "below" ? "#fff5f5" : "#ffffff";
        const indispColor =
          status === "above"
            ? "#2e7d32"
            : status === "below"
              ? "#c62828"
              : "#000000";
        const dotColor = status !== "neutral" ? indispColor : null;

        const tempoIndisp = pausa?.tempoIndisponivel ?? "00:00:00";
        const nr17 = pausa?.nr17 ?? "00:00:00";
        const particular = pausa?.pausaParticular ?? "00:00:00";

        return (
          <div
            key={op.email}
            style={{
              display: "grid",
              gridTemplateColumns: gridTemplate,
              background: rowBg,
              borderBottom: isLast ? "none" : "1px solid #d0d0d0",
            }}
          >
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                fontWeight: status === "below" ? 600 : 400,
              }}
            >
              {formatOperatorLabel(op.email)}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                ...EXCEL_COL_DIVIDER,
                color: tempoIndisp === "00:00:00" ? "#4a5560" : "#000000",
              }}
            >
              {tempoIndisp}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                ...EXCEL_COL_DIVIDER,
                color: nr17 === "00:00:00" ? "#4a5560" : "#000000",
              }}
            >
              {nr17}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                ...EXCEL_COL_DIVIDER,
                color: particular === "00:00:00" ? "#4a5560" : "#000000",
              }}
            >
              {particular}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                color: indispColor,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "6px",
              }}
            >
              <span>{formatPercent(op.indispPercent)}</span>
              {dotColor && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
