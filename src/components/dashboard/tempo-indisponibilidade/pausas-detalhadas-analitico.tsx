"use client";

import { IconClock } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import type { GestorIndispLinha, PausasDetalhe } from "@/lib/d1-db/types";

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
  { key: "email", label: "E-mail" },
  { key: "indisponivel", label: "Indisp." },
  { key: "sistema", label: "Sistema" },
];

const GRID_COLS = "1.8fr repeat(12, 1fr)";
const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";

function fmt(s: string): string {
  if (!s || s === "00:00:00") return "—";
  return s;
}

interface Props {
  operadores: GestorIndispLinha[];
}

export function PausasDetalhadasAnalitico({ operadores }: Props) {
  const comDados = operadores.filter((op) => op.indisponibilidade !== null);

  if (comDados.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* ── Título e descrição fora do card no padrão do Analítico ───── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconClock size={20} className="text-foreground" />
          Tabela de Pausas Detalhadas
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento de todas as pausas registradas por operador no período.
        </p>
      </div>

      {/* ── Card em StyledCard com cantos azuis e gradiente de fundo ──── */}
      <StyledCard className="p-0 overflow-hidden" withGradient>
        <div className="overflow-x-auto scrollbar-tema">
          <div className="w-full min-w-[1000px]">
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
                  textAlign: "left" as const,
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  background: "color-mix(in oklch, var(--muted) 40%, var(--card))",
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
            {comDados.map((op, idx) => {
              const isLast = idx === comDados.length - 1;
              return (
                <div
                  key={op.email}
                  className="hover:bg-muted/40 transition-colors"
                  style={{
                    display: "grid",
                    gridTemplateColumns: GRID_COLS,
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                    fontFamily: SANS_STACK,
                  }}
                >
                  <div
                    className="ds-body font-medium"
                    style={{
                      padding: "6px 10px",
                      fontSize: "12px",
                      textAlign: "left",
                      borderRight: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--foreground)",
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                      background: "var(--card)",
                    }}
                  >
                    {formatNomeDotSobrenome(op.email)}
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
                          fontWeight: isEmpty ? 400 : 600,
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
      </StyledCard>
    </div>
  );
}
