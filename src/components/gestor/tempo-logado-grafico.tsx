"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import {
  META_TEMPO_LOGADO_SEGUNDOS,
  type GestorTempoLogadoLinha,
} from "@/lib/google/gestor/tempo-logado-types";

const CHART_HEIGHT = 300;
const Y_AXIS_WIDTH = 56;

function formatTempoSegundos(s: number): string {
  if (s <= 0) return "00:00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatTickTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function barColor(op: GestorTempoLogadoLinha): string {
  if (op.status === "ausente") return "var(--muted-foreground)";
  if (op.status === "ainda_logado") return "var(--primary)";
  return op.cumpriuMeta ? "var(--success)" : "var(--danger)";
}

interface TempoLogadoGraficoProps {
  operadores: GestorTempoLogadoLinha[];
}

export function TempoLogadoGrafico({ operadores }: TempoLogadoGraficoProps) {
  const chartData = operadores.map((op) => ({
    nome: deriveNomeOperador(op.email),
    tempo: op.tempoLogadoSegundos,
    tempoFormatado: formatTempoSegundos(op.tempoLogadoSegundos),
    status: op.status,
    cumpriuMeta: op.cumpriuMeta,
    _op: op,
  }));

  const maxTempo = Math.max(
    ...operadores.map((op) => op.tempoLogadoSegundos),
    META_TEMPO_LOGADO_SEGUNDOS,
  );
  const yMax = Math.ceil((maxTempo * 1.15) / 3600) * 3600;

  const yTicks: number[] = [];
  for (let sec = 0; sec <= yMax; sec += 3600) {
    yTicks.push(sec);
  }
  if (!yTicks.includes(META_TEMPO_LOGADO_SEGUNDOS)) {
    yTicks.push(META_TEMPO_LOGADO_SEGUNDOS);
    yTicks.sort((a, b) => a - b);
  }

  return (
    <div className="elevation-1 overflow-hidden rounded-xl bg-card border border-border/80">
      {/* Legenda de cores e informações da meta, posicionada no topo com padding */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex flex-wrap items-center gap-4">
          {[
            { color: "var(--success)", label: "Cumpriu a meta" },
            { color: "var(--danger)", label: "Abaixo da meta" },
            { color: "var(--primary)", label: "Ainda logado" },
            { color: "var(--muted-foreground)", label: "Ausente" },
          ].map(({ color, label }) => (
            <span key={label} className="ds-mono-sm text-muted-foreground flex items-center gap-1.5">
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
          Linha tracejada = meta 06:20:00
        </span>
      </div>

      <div className="px-6 pb-6 pt-2 w-full" style={{ height: `${CHART_HEIGHT}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 16, left: -20, bottom: 40 }}
            barSize={32}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.2} />
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
              width={Y_AXIS_WIDTH}
              ticks={yTicks}
              domain={[0, yMax]}
              tickFormatter={formatTickTempo}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              stroke="var(--border)"
            />
            <Tooltip
              cursor={{ fill: "var(--elevation-2-bg)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                const statusLabel =
                  d.status === "completo"
                    ? d.cumpriuMeta
                      ? "Cumpriu a meta"
                      : "Abaixo da meta"
                    : d.status === "ainda_logado"
                      ? "Ainda logado"
                      : "Ausente";
                return (
                  <div
                    className="ds-small rounded-md px-3 py-2"
                    style={{
                      background: "var(--elevation-3-bg)",
                      border: "1px solid var(--elevation-3-border)",
                      color: "var(--foreground)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      minWidth: "160px",
                    }}
                  >
                    <div className="ds-mono-sm text-muted-foreground mb-1 font-bold">
                      {d.nome}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Tempo:</span>
                      <span className="ds-mono font-bold text-sm">
                        {d.tempoFormatado}
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
              y={META_TEMPO_LOGADO_SEGUNDOS}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
              strokeOpacity={0.4}
            />
            <Bar
              dataKey="tempo"
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
  );
}
