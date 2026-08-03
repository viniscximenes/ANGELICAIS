"use client";

import { forwardRef } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { GestorIndispLinha } from "@/lib/google/gestor";

const GRID_COLS = "2fr 1.8fr 1.6fr 2fr 1.8fr";

const NO_FANTASIA: NomeFantasiaSerial = { ativo: false, mapa: {} };

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

interface IndisponibilidadeTableProps {
  operadores: GestorIndispLinha[];
  variant?: "screen" | "excel";
  nomeFantasia?: NomeFantasiaSerial;
  olhoAberto?: boolean;
  onToggleOlho?: () => void;
}

export const IndisponibilidadeTable = forwardRef<
  HTMLDivElement,
  IndisponibilidadeTableProps
>(function IndisponibilidadeTable({ operadores, variant = "screen", nomeFantasia, olhoAberto, onToggleOlho }, ref) {
  const cfg = nomeFantasia ?? NO_FANTASIA;
  if (variant === "excel") {
    return <ExcelTable ref={ref} operadores={operadores} nomeFantasia={cfg} />;
  }
  return (
    <ScreenTable
      ref={ref}
      operadores={operadores}
      nomeFantasia={cfg}
      olhoAberto={olhoAberto}
      onToggleOlho={onToggleOlho}
    />
  );
});

/* ────────────────────────────────────────────────────────────────────
   SCREEN
   ──────────────────────────────────────────────────────────────────── */

const ScreenTable = forwardRef<
  HTMLDivElement,
  {
    operadores: GestorIndispLinha[];
    nomeFantasia: NomeFantasiaSerial;
    olhoAberto?: boolean;
    onToggleOlho?: () => void;
  }
>(function ScreenTable({ operadores, nomeFantasia, olhoAberto, onToggleOlho }, ref) {
  const cfgDisplay: NomeFantasiaSerial =
    olhoAberto && nomeFantasia.ativo ? { ...nomeFantasia, ativo: false } : nomeFantasia;

  return (
    <div
      ref={ref}
      className="elevation-1 overflow-hidden rounded-xl border border-border/80"
    >
      {/* Cabeçalho */}
      <div
        className="ds-mono-sm text-muted-foreground grid gap-0 font-semibold tracking-wider uppercase bg-muted/40"
        style={{
          gridTemplateColumns: GRID_COLS,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap flex items-center justify-center gap-1.5">
          Operador
          {onToggleOlho && nomeFantasia.ativo && (
            <button
              type="button"
              onClick={onToggleOlho}
              title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {olhoAberto ? <IconEye size={12} /> : <IconEyeOff size={12} />}
            </button>
          )}
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Indisp. %
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          NR17 %
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Pausa Part. %
        </div>
        <div className="px-3 py-2.5 text-center whitespace-nowrap">
          Outras %
        </div>
      </div>

      {/* Linhas */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        // Sem dados (indisponibilidade null = #DIV/0! na planilha): row atenuada
        const semDados = op.indisponibilidade === null;
        // Acima da meta: só quem TEM dado E não cumpriu
        const acimaMeta = !semDados && !op.cumpriuMeta;

        return (
          <div
            key={op.email}
            className="grid items-center gap-0"
            style={{
              gridTemplateColumns: GRID_COLS,
              background: acimaMeta
                ? "color-mix(in oklch, var(--danger) 5%, transparent)"
                : "transparent",
              borderBottom: isLast ? "none" : "1px solid var(--border)/40",
              opacity: semDados ? 0.4 : 1,
            }}
          >
            <div
              className="ds-body truncate px-3 py-2 text-center border-r border-border/30 font-medium"
              style={{
                color: acimaMeta ? "var(--danger)" : "var(--foreground)",
              }}
            >
              {resolverNomeExibicao(op.email, cfgDisplay)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30"
              style={{
                fontVariantNumeric: "tabular-nums",
                color: acimaMeta ? "var(--danger)" : "var(--foreground)",
              }}
            >
              {fmtPct(op.indisponibilidade)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30 text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.nr17Pct)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30 text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.pausaParticularPct)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.outrasPausasPct)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────────
   EXCEL — wrapper invisível para captura do PNG
   ──────────────────────────────────────────────────────────────────── */

const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";
const EXCEL_RED = "#c62828";
const EXCEL_RED_BG = "#ffe5e5";
const EXCEL_NEUTRAL = "#000000";
const EXCEL_MUTED = "#555555";

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
  fontVariantNumeric: "tabular-nums",
};

const EXCEL_HEADER_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #4a7ba6",
};

const EXCEL_COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #d0d0d0",
};

const ExcelTable = forwardRef<
  HTMLDivElement,
  { operadores: GestorIndispLinha[]; nomeFantasia: NomeFantasiaSerial }
>(function ExcelTable({ operadores, nomeFantasia }, ref) {
  return (
    <div
      ref={ref}
      style={{
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #c0c0c0",
        boxShadow: "none",
        fontFamily: SANS_STACK,
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLS,
          background: "#1f4e78",
          borderBottom: "1px solid #1f4e78",
        }}
      >
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Operador
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Indisp. %
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          NR17 %
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Pausa Part. %
        </div>
        <div style={EXCEL_HEADER_CELL}>Outras %</div>
      </div>

      {/* Linhas */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const acimaMeta = op.indisponibilidade !== null && !op.cumpriuMeta;

        return (
          <div
            key={op.email}
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              background: acimaMeta ? EXCEL_RED_BG : "#ffffff",
              borderBottom: isLast ? "none" : "1px solid #d0d0d0",
            }}
          >
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: acimaMeta ? EXCEL_RED : EXCEL_NEUTRAL,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {resolverNomeExibicao(op.email, nomeFantasia)}
            </div>
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: acimaMeta ? EXCEL_RED : EXCEL_NEUTRAL,
              }}
            >
              {fmtPct(op.indisponibilidade)}
            </div>
            <div
              style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}
            >
              {fmtPct(op.nr17Pct)}
            </div>
            <div
              style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}
            >
              {fmtPct(op.pausaParticularPct)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, color: EXCEL_MUTED }}>
              {fmtPct(op.outrasPausasPct)}
            </div>
          </div>
        );
      })}
    </div>
  );
});
