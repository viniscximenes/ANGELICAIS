"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import {
  META_INDISPONIBILIDADE,
  type GestorIndispLinha,
} from "@/lib/google/gestor/indisponibilidade-types";

const CHART_HEIGHT = 300;
const BAR_WIDTH = 40;
const MIN_CHART_WIDTH = 600;

function fmtPct(n: number): string {
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function barColor(op: GestorIndispLinha): string {
  if (op.indisponibilidade === null) return "var(--muted-foreground)";
  return op.cumpriuMeta ? "var(--success)" : "var(--danger)";
}

interface IndisponibilidadeGraficoProps {
  operadores: GestorIndispLinha[];
}

export function IndisponibilidadeGrafico({
  operadores,
}: IndisponibilidadeGraficoProps) {
  const chartData = operadores.map((op) => ({
    nome: deriveNomeOperador(op.email),
    valor: op.indisponibilidade ?? 0,
    valorFormatado:
      op.indisponibilidade !== null ? fmtPct(op.indisponibilidade) : "—",
    ausente: op.indisponibilidade === null,
    cumpriuMeta: op.cumpriuMeta,
    _op: op,
  }));

  const maxVal = Math.max(
    ...operadores.map((op) => op.indisponibilidade ?? 0),
    META_INDISPONIBILIDADE,
  );
  // Y máximo: arredonda pra cima ao múltiplo de 5 acima de 120% do valor máximo
  const yMax = Math.max(
    Math.ceil((maxVal * 1.2) / 5) * 5,
    Math.ceil((META_INDISPONIBILIDADE * 1.4) / 5) * 5,
  );

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += 5) yTicks.push(v);

  const chartWidth = Math.max(
    MIN_CHART_WIDTH,
    operadores.length * (BAR_WIDTH + 24) + 80,
  );

  return (
    <div className="elevation-1 overflow-hidden rounded-xl border border-border/80 bg-card">
      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-5">
        <div className="flex flex-wrap items-center gap-4">
          {[
            { color: "var(--success)", label: "Dentro da meta" },
            { color: "var(--danger)", label: "Acima da meta" },
            { color: "var(--muted-foreground)", label: "Sem dados" },
          ].map(({ color, label }) => (
            <span
              key={label}
              className="ds-mono-sm text-muted-foreground flex items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
        <span className="ds-mono-sm text-muted-foreground hidden sm:inline-block">
          Linha tracejada = meta {META_INDISPONIBILIDADE}%
        </span>
      </div>

      {/* Gráfico com scroll horizontal */}
      <div className="overflow-x-auto pb-2">
        <div
          style={{ minWidth: `${chartWidth}px`, height: `${CHART_HEIGHT}px` }}
          className="px-4 pb-4 pt-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 16, left: -16, bottom: 40 }}
              barSize={BAR_WIDTH}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
                opacity={0.2}
              />
              <XAxis
                dataKey="nome"
                interval={0}
                angle={-25}
                textAnchor="end"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                height={50}
              />
              <YAxis
                width={48}
                ticks={yTicks}
                domain={[0, yMax]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
              />
              <Tooltip
                cursor={{ fill: "var(--elevation-2-bg)", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  const statusLabel = d.ausente
                    ? "Sem dados"
                    : d.cumpriuMeta
                      ? "Dentro da meta"
                      : "Acima da meta";
                  return (
                    <div
                      className="ds-small rounded-md px-3 py-2"
                      style={{
                        background: "var(--elevation-3-bg)",
                        border: "1px solid var(--elevation-3-border)",
                        color: "var(--foreground)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        minWidth: "180px",
                      }}
                    >
                      <div className="ds-mono-sm text-muted-foreground mb-1 font-bold">
                        {d.nome}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Indisponibilidade:</span>
                        <span className="ds-mono font-bold text-sm">
                          {d.valorFormatado}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 mt-0.5">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="ds-mono-sm">{statusLabel}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={META_INDISPONIBILIDADE}
                stroke="var(--foreground)"
                strokeDasharray="5 4"
                strokeOpacity={0.4}
              />
              <Bar
                dataKey="valor"
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {chartData.map((d, idx) => (
                  <Cell key={idx} fill={barColor(d._op)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
