"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MotivosBreakdown } from "@/lib/google/d1";

interface MotivosChartProps {
  data: MotivosBreakdown;
  view: "cancelados" | "retidos";
}

const LABELS = {
  financeiro: "Financeiro",
  mudancaEndereco: "Mud. Endereço",
  insatisfacaoServico: "Ins. Serviço",
  insatisfacaoAtendimento: "Ins. Atendimento",
  mudancaProvedora: "Mud. Provedora",
  outros: "Outros",
} as const;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { motivo: string } }>;
  total: number;
  view: "cancelados" | "retidos";
}

function CustomTooltip({ active, payload, total, view }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  const value = item.value;
  const pct = ((value / total) * 100).toFixed(1);
  const label = view === "cancelados" ? "Cancelados" : "Retidos";

  return (
    <div
      className="ds-small rounded-md px-3 py-2"
      style={{
        background: "var(--elevation-3-bg)",
        border: "1px solid var(--elevation-3-border)",
        color: "var(--foreground)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div className="ds-mono-sm text-muted-foreground mb-1">
        {item.payload.motivo}
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--foreground)" }}>{label}:</span>
        <span className="ds-mono" style={{ color: "var(--foreground)" }}>
          {value}
        </span>
        <span className="text-muted-foreground ds-mono-sm">({pct}%)</span>
      </div>
    </div>
  );
}

export function MotivosChart({ data, view }: MotivosChartProps) {
  const chartData = (Object.keys(LABELS) as Array<keyof typeof LABELS>).map(
    (key) => ({
      motivo: LABELS[key],
      valor: data[key],
    }),
  );

  const total = chartData.reduce((sum, d) => sum + d.valor, 0);

  if (total === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="ds-body text-muted-foreground">
          Sem dados de {view} para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 12, left: 0, bottom: 5 }}
        >
          <XAxis
            dataKey="motivo"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            stroke="var(--border)"
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--elevation-2-bg)", opacity: 0.4 }}
            content={(props) => (
              <CustomTooltip
                {...(props as unknown as CustomTooltipProps)}
                total={total}
                view={view}
              />
            )}
          />
          <Bar
            dataKey="valor"
            radius={[6, 6, 0, 0]}
            animationDuration={500}
            animationEasing="ease-out"
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill="var(--primary)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
