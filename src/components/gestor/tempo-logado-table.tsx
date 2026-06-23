"use client";

import { forwardRef } from "react";

import type {
  NomeFantasiaSerial} from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type {
  GestorTempoLogadoLinha,
  StatusPresenca,
} from "@/lib/google/gestor";

const NO_FANTASIA: NomeFantasiaSerial = { ativo: false, mapa: {} };

interface TempoLogadoTableProps {
  operadores: GestorTempoLogadoLinha[];
  variant?: "screen" | "excel";
  nomeFantasia?: NomeFantasiaSerial;
}

function formatLogin(_status: StatusPresenca, horaLogin: string | null): string {
  // "ainda_logado" agora sempre tem login (regra: sem login = ausente).
  // "ausente" tem horaLogin null. Basta devolver o valor ou "—".
  return horaLogin ?? "—";
}

function formatLogout(
  status: StatusPresenca,
  horaLogout: string | null,
): string {
  if (status === "ainda_logado") return "Ainda logado";
  if (status === "ausente") return "—";
  return horaLogout ?? "—";
}

export const TempoLogadoTable = forwardRef<
  HTMLDivElement,
  TempoLogadoTableProps
>(function TempoLogadoTable({ operadores, variant = "screen", nomeFantasia }, ref) {
  const cfg = nomeFantasia ?? NO_FANTASIA;
  if (variant === "excel") {
    return <ExcelTable ref={ref} operadores={operadores} nomeFantasia={cfg} />;
  }
  return <ScreenTable ref={ref} operadores={operadores} nomeFantasia={cfg} />;
});

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const GRID_COLS = "2.2fr 2.6fr 2.4fr 1.9fr 1.9fr";

const ScreenTable = forwardRef<
  HTMLDivElement,
  { operadores: GestorTempoLogadoLinha[]; nomeFantasia: NomeFantasiaSerial }
>(function ScreenTable({ operadores, nomeFantasia }, ref) {
  return (
    <div
      ref={ref}
      data-tempo-logado-table
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
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Operador
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Tempo Logado
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Logout Est.
        </div>
        <div className="px-3 py-2.5 text-center border-r border-border/50 whitespace-nowrap">
          Login
        </div>
        <div className="px-3 py-2.5 text-center whitespace-nowrap">Logout</div>
      </div>

      {/* Linhas de operadores */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        // Só pinta vermelho quem terminou o dia (completo) abaixo da meta.
        // Quem ainda está logado (ainda_logado) não é penalizado — pode
        // cumprir a meta antes do fim do turno.
        const belowMeta = op.status === "completo" && !op.cumpriuMeta;
        const isAusente = op.status === "ausente";
        const isAindaLogado = op.status === "ainda_logado";

        return (
          <div
            key={op.email}
            className="grid items-center gap-0"
            style={{
              gridTemplateColumns: GRID_COLS,
              background: belowMeta
                ? "color-mix(in oklch, var(--danger) 5%, transparent)"
                : "transparent",
              borderBottom: isLast ? "none" : "1px solid var(--border)/40",
              opacity: isAusente ? 0.4 : 1,
            }}
          >
            <div
              className="ds-body truncate px-3 py-2 text-center border-r border-border/30 font-medium"
              style={{
                color: belowMeta ? "var(--danger)" : "var(--foreground)",
              }}
            >
              {resolverNomeExibicao(op.email, nomeFantasia)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30"
              style={{
                fontVariantNumeric: "tabular-nums",
                color: belowMeta ? "var(--danger)" : "var(--foreground)",
              }}
            >
              {op.tempoLogado || "—"}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30 text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {op.logoutEstimado || "—"}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center border-r border-border/30 text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatLogin(op.status, op.horaLogin)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center"
              style={{
                fontVariantNumeric: "tabular-nums",
                color: "var(--muted-foreground)",
                fontStyle: isAindaLogado ? "italic" : "normal",
              }}
            >
              {formatLogout(op.status, op.horaLogout)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
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
  { operadores: GestorTempoLogadoLinha[]; nomeFantasia: NomeFantasiaSerial }
>(function ExcelTable({ operadores, nomeFantasia }, ref) {
  const cols = GRID_COLS;

  return (
    <div
      ref={ref}
      data-tempo-logado-table
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
          gridTemplateColumns: cols,
          background: "#1f4e78",
          borderBottom: "1px solid #1f4e78",
        }}
      >
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Operador
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Tempo Logado
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Logout Est.
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Login
        </div>
        <div style={EXCEL_HEADER_CELL}>Logout</div>
      </div>

      {/* Linhas */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const belowMeta = op.status === "completo" && !op.cumpriuMeta;

        return (
          <div
            key={op.email}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              background: belowMeta ? EXCEL_RED_BG : "#ffffff",
              borderBottom: isLast ? "none" : "1px solid #d0d0d0",
            }}
          >
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: belowMeta ? EXCEL_RED : EXCEL_NEUTRAL,
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
                color: belowMeta ? EXCEL_RED : EXCEL_NEUTRAL,
              }}
            >
              {op.tempoLogado || "—"}
            </div>
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: EXCEL_MUTED,
              }}
            >
              {op.logoutEstimado || "—"}
            </div>
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: EXCEL_MUTED,
              }}
            >
              {formatLogin(op.status, op.horaLogin)}
            </div>
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                color: EXCEL_MUTED,
              }}
            >
              {formatLogout(op.status, op.horaLogout)}
            </div>
          </div>
        );
      })}
    </div>
  );
});
