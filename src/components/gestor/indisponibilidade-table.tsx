"use client";

import { forwardRef } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { GestorIndispLinha } from "@/lib/d1-db/types";
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
  TABELA_VALOR_BULLET_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemantico,
  ValorSemDado,
} from "./tabela-padrao";

const GRID_COLS = "2fr 1.8fr 1.6fr 2fr 1.8fr 1.8fr";

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
    <div ref={ref} data-indisp-table className={TABELA_CONTAINER_CLASS}>
      {/* Cabeçalho */}
      <div
        className={TABELA_HEADER_CLASS}
        style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
      >
        <div className={cn(TABELA_HEADER_CELL_CLASS, "flex items-center justify-center gap-1.5")}>
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
        <div className={TABELA_HEADER_CELL_CLASS}>Indisp. %</div>
        <div className={TABELA_HEADER_CELL_CLASS}>NR17 %</div>
        <div className={TABELA_HEADER_CELL_CLASS}>Pausa Part. %</div>
        <div className={TABELA_HEADER_CELL_CLASS}>Monitoramento %</div>
        <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>Feedback %</div>
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
            className={TABELA_LINHA_CLASS}
            style={{
              gridTemplateColumns: GRID_COLS,
              background: fundoLinhaRuim(acimaMeta) ?? "transparent",
              borderBottom: isLast ? "none" : "1px solid var(--border)/40",
              opacity: semDados ? 0.4 : 1,
            }}
          >
            <div
              className={TABELA_NOME_CELL_CLASS}
              style={{ color: corNomeOperador({ ruim: acimaMeta }) }}
            >
              {resolverNomeExibicao(op.email, cfgDisplay)}
            </div>
            <div className={TABELA_VALOR_BULLET_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
              {semDados ? (
                <ValorSemDado />
              ) : (
                <ValorSemantico ruim={acimaMeta}>{fmtPct(op.indisponibilidade)}</ValorSemantico>
              )}
            </div>
            <div
              className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground")}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.nr17Pct)}
            </div>
            <div
              className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground")}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.pausaParticularPct)}
            </div>
            <div
              className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground")}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.monitoramentoPct)}
            </div>
            <div
              className="ds-mono-sm px-3 py-2 text-center text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(op.feedbackPct)}
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
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Monitoramento %
        </div>
        <div style={EXCEL_HEADER_CELL}>Feedback %</div>
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
            <div
              style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}
            >
              {fmtPct(op.monitoramentoPct)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, color: EXCEL_MUTED }}>
              {fmtPct(op.feedbackPct)}
            </div>
          </div>
        );
      })}
    </div>
  );
});
