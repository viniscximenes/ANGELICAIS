"use client";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";

const META_INDISP = 14.5;

interface IndispPausasTableProps {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
  variant?: "screen" | "excel";
}

type IndispStatus = "above" | "below" | "neutral";

const PAUSA_COLUMNS: Array<{ key: keyof OperadorPausa; label: string }> = [
  { key: "pausa10", label: "Pausa 10" },
  { key: "pausa20", label: "Pausa 20" },
  { key: "pausaParticular", label: "Particular" },
  { key: "pausaMonitoramento", label: "Monit." },
  { key: "pausaTreinamento", label: "Treinam." },
  { key: "pausaFeedback", label: "Feedback" },
  { key: "pausaPrePausa", label: "Pré pausa" },
  { key: "pausaAtivo", label: "Ativo" },
  { key: "pausaTakeBlip", label: "Take blip" },
  { key: "pausaOperacional", label: "Operac." },
  { key: "pausaEmail", label: "E-mail" },
  { key: "pausaIndisponivel", label: "Indisp." },
  { key: "pausaSistema", label: "Sistema" },
];

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

export function IndispPausasTable({
  operadoresIndisp,
  operadoresPausa,
  variant = "screen",
}: IndispPausasTableProps) {
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
  const gridTemplate = `1.4fr ${PAUSA_COLUMNS.map(() => "0.7fr").join(" ")} 0.9fr`;

  return (
    <div className="elevation-1 rounded-xl p-2" data-indisp-pausas-table>
      <div
        className="grid gap-0 overflow-hidden rounded-md"
        style={{
          background: "var(--elevation-2-bg)",
          gridTemplateColumns: gridTemplate,
        }}
      >
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1 py-1.5 font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)", fontSize: "9px" }}
        >
          Operador
        </span>
        {PAUSA_COLUMNS.map((col) => (
          <span
            key={col.key}
            className="ds-mono-sm border-r border-[var(--border)] px-1 py-1.5 text-right font-semibold tracking-wider uppercase"
            style={{ color: "var(--muted-foreground)", fontSize: "9px" }}
          >
            {col.label}
          </span>
        ))}
        <span
          className="ds-mono-sm px-1 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)", fontSize: "9px" }}
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
            className="grid gap-0 py-0.5"
            style={{ background: rowBg, gridTemplateColumns: gridTemplate }}
          >
            <span
              className="ds-mono-sm text-muted-foreground flex items-center border-r border-[var(--border)] px-1"
              style={{ fontSize: "10px" }}
            >
              {formatOperatorLabel(op.email)}
            </span>
            {PAUSA_COLUMNS.map((col) => {
              const value = (pausa?.[col.key] as string) ?? "00:00:00";
              const isZero = value === "00:00:00";
              return (
                <span
                  key={col.key}
                  className="ds-mono-sm flex items-center justify-end border-r border-[var(--border)] px-1 text-right"
                  style={{
                    color: isZero
                      ? "var(--muted-foreground)"
                      : "color-mix(in oklch, var(--foreground) 75%, transparent)",
                    fontSize: "10px",
                  }}
                >
                  {value}
                </span>
              );
            })}
            <span
              className="ds-mono-sm flex items-center justify-end gap-1.5 px-1 font-medium"
              style={{ color: indispColor, fontSize: "10px" }}
            >
              {formatPercent(op.indispPercent)}
              {dotColor && (
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
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

function ExcelTable({
  operadoresIndisp,
  operadoresPausa,
}: {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}) {
  const pausaMap = new Map(operadoresPausa.map((p) => [p.email, p]));
  const gridTemplate = `1.6fr ${PAUSA_COLUMNS.map(() => "0.7fr").join(" ")} 0.9fr`;
  const lastIdx = operadoresIndisp.length - 1;

  const headerCellBase: React.CSSProperties = {
    padding: "6px 6px",
    fontFamily: SANS_STACK,
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    color: "#ffffff",
  };

  const numCellBase: React.CSSProperties = {
    padding: "5px 6px",
    fontFamily: MONO_STACK,
    fontSize: "11px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };

  const textCellBase: React.CSSProperties = {
    padding: "5px 6px",
    fontFamily: SANS_STACK,
    fontSize: "11px",
    textAlign: "left",
    color: "#000000",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div
      data-indisp-pausas-table
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
        <div style={{ ...headerCellBase, ...EXCEL_HEADER_DIVIDER }}>
          Operador
        </div>
        {PAUSA_COLUMNS.map((col) => (
          <div
            key={col.key}
            style={{
              ...headerCellBase,
              ...EXCEL_HEADER_DIVIDER,
              textAlign: "right",
            }}
          >
            {col.label}
          </div>
        ))}
        <div style={{ ...headerCellBase, textAlign: "right" }}>Indisp %</div>
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
                ...textCellBase,
                ...EXCEL_COL_DIVIDER,
                fontWeight: status === "below" ? 600 : 400,
              }}
            >
              {formatOperatorLabel(op.email)}
            </div>
            {PAUSA_COLUMNS.map((col) => {
              const value = (pausa?.[col.key] as string) ?? "00:00:00";
              const isZero = value === "00:00:00";
              return (
                <div
                  key={col.key}
                  style={{
                    ...numCellBase,
                    ...EXCEL_COL_DIVIDER,
                    color: isZero ? "#4a5560" : "#000000",
                  }}
                >
                  {value}
                </div>
              );
            })}
            <div
              style={{
                ...numCellBase,
                color: indispColor,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "5px",
              }}
            >
              <span>{formatPercent(op.indispPercent)}</span>
              {dotColor && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
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
