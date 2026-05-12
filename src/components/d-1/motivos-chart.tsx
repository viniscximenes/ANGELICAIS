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
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
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
            cursor={{ fill: "var(--elevation-2-bg)" }}
            contentStyle={{
              background: "var(--elevation-2-bg)",
              border: "1px solid var(--elevation-2-border)",
              borderRadius: "8px",
              fontSize: "0.875rem",
            }}
            formatter={(value: number) => {
              const pct = ((value / total) * 100).toFixed(1);
              return [
                `${value} (${pct}%)`,
                view === "cancelados" ? "Cancelados" : "Retidos",
              ];
            }}
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
