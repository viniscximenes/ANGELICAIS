"use client";

import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import type { GestorIndispLinha, PausasDetalhe } from "@/lib/google/gestor/indisponibilidade-types";

type PausaKey = keyof PausasDetalhe;

const COLUNAS: { key: PausaKey; label: string }[] = [
  { key: "pausa10", label: "Pausa 10" },
  { key: "pausa20", label: "Pausa 20" },
  { key: "pausaParticular", label: "Particular" },
  { key: "monOuTaref", label: "Mon/Taref" },
  { key: "trenOuReun", label: "Tren/Reun" },
  { key: "feedback", label: "Feedback" },
  { key: "prePausa", label: "Pré Pausa" },
  { key: "ativo", label: "Ativo" },
  { key: "takeBlip", label: "Take Blip" },
  { key: "pausa15", label: "Pausa 15" },
  { key: "pausa40", label: "Pausa 40" },
  { key: "operacional", label: "Operacional" },
  { key: "email", label: "E-mail" },
  { key: "indisponivel", label: "Indisp." },
  { key: "sistema", label: "Sistema" },
  { key: "pausaSemMotivo", label: "Sem Motivo" },
];

const COL_OPERADOR = 120;
const COL_PAUSA = 82;
const TABLE_MIN_WIDTH = COL_OPERADOR + COLUNAS.length * COL_PAUSA;

const GRID_COLS = `${COL_OPERADOR}px repeat(${COLUNAS.length}, ${COL_PAUSA}px)`;

const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";

function fmt(s: string): string {
  if (!s || s === "00:00:00") return "—";
  return s;
}

interface IndisponibilidadePausasTableProps {
  operadores: GestorIndispLinha[];
}

export function IndisponibilidadePausasTable({
  operadores,
}: IndisponibilidadePausasTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 elevation-1 scrollbar-tema">
      <div style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}>
        {/* Cabeçalho */}
        <div
          className="ds-mono-sm text-muted-foreground grid gap-0 font-semibold tracking-wider uppercase bg-muted/40"
          style={{
            gridTemplateColumns: GRID_COLS,
            borderBottom: "1px solid var(--border)",
            fontFamily: SANS_STACK,
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              fontSize: "10px",
              fontWeight: 600,
              textAlign: "center" as const,
            }}
            className="border-r border-border/30"
          >
            Operador
          </div>
          {COLUNAS.map((col, i) => (
            <div
              key={col.key}
              style={{
                padding: "8px 4px",
                fontSize: "10px",
                fontWeight: 600,
                textAlign: "center" as const,
                whiteSpace: "nowrap" as const,
              }}
              className={i < COLUNAS.length - 1 ? "border-r border-border/30" : undefined}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Linhas */}
        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semDados = op.indisponibilidade === null;

          return (
            <div
              key={op.email}
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLS,
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                opacity: semDados ? 0.4 : 1,
                fontFamily: SANS_STACK,
              }}
            >
              <div
                className="ds-body"
                style={{
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  textAlign: "center",
                  borderRight: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "var(--foreground)",
                }}
              >
                {deriveNomeOperador(op.email)}
              </div>
              {COLUNAS.map((col, i) => {
                const val = fmt(op.pausas[col.key]);
                const isEmpty = val === "—";
                return (
                  <div
                    key={col.key}
                    style={{
                      padding: "6px 4px",
                      fontSize: "11px",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums" as const,
                      borderRight: i < COLUNAS.length - 1 ? "1px solid var(--border)" : undefined,
                      color: isEmpty ? "var(--muted-foreground)" : "var(--foreground)",
                    }}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
