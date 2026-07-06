"use client";

import {
  ComposedChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import { IconChartLine } from "@tabler/icons-react";
interface GraficoEvolucaoProps {
  dados: HoraEvolucaoData[];
  horaSelecionada: "total" | number;
  meta: number; // Meta de 0 a 100
}

export function GraficoEvolucao({ dados, horaSelecionada, meta }: GraficoEvolucaoProps) {
  const chartData = dados.map((d) => ({
    ...d,
    txDisplay: d.tx !== null ? parseFloat((d.tx * 100).toFixed(1)) : null,
  }));

  // Calcula o offset exato do gradiente com base no máximo e mínimo dos dados apresentados
  const validTxValues = chartData.map((d) => d.txDisplay).filter((v): v is number => v !== null);
  const dataMax = validTxValues.length > 0 ? Math.max(...validTxValues) : 100;
  const dataMin = validTxValues.length > 0 ? Math.min(...validTxValues) : 0;

  let gradientOffset = 0;
  if (dataMax <= meta) {
    gradientOffset = 0;
  } else if (dataMin >= meta) {
    gradientOffset = 1;
  } else {
    gradientOffset = (dataMax - meta) / (dataMax - dataMin);
  }



  // Define se uma hora específica deve ser destacada verticalmente
  const horaDestacadaLabel =
    horaSelecionada !== "total"
      ? `${String(horaSelecionada).padStart(2, "0")}:00`
      : null;

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconChartLine size={20} className="text-foreground" />
          Evolução e Pedidos do Turno
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Acompanhe a taxa de retenção (linha) e o volume de atendimentos (barras) ao longo das horas.
        </p>
      </div>

      <div className="w-full h-[280px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="txLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--danger)" />
                <stop offset={1} stopColor="var(--danger)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
            
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, opacity: 0.5 }}
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const info = payload[0].payload as typeof chartData[0];
                return (
                  <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl space-y-1.5 font-sans">
                    <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Hora: {info.label}
                    </p>
                    <div className="h-px bg-white/10 my-1" />
                    <p className="text-xs text-muted-foreground">
                      Retenção:{" "}
                      <strong className={info.txDisplay !== null && info.txDisplay < meta ? "text-danger" : "text-success"}>
                        {info.txDisplay !== null ? `${info.txDisplay}%` : "—"}
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedidos: <strong className="text-foreground">{info.total}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Retidos: <strong className="text-foreground">{info.retidos}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cancelados: <strong className="text-foreground">{info.cancelados}</strong>
                    </p>
                  </div>
                );
              }}
            />

            {/* Fundo do Volume (Barras) */}
            <Bar
              yAxisId="right"
              dataKey="total"
              barSize={30}
              radius={[4, 4, 0, 0]}
              animationDuration={300}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => {
                const isBelow = entry.txDisplay !== null && entry.txDisplay < meta;
                const cellColor = isBelow ? "var(--danger)" : "var(--success)";
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={cellColor}
                    opacity={0.15}
                  />
                );
              })}
            </Bar>

            {/* Referência da Meta */}
            <ReferenceLine
              yAxisId="left"
              y={meta}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeDasharray="3 3"
              strokeOpacity={0.8}
              label={{
                value: `Meta: ${meta.toFixed(0)}%`,
                position: "insideBottomLeft",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                fontWeight: 600,
                offset: 5,
              }}
            />

            {/* Linha de Destaque Vertical para a Hora Ativa no filtro */}
            {horaDestacadaLabel && (
              <ReferenceLine
                x={horaDestacadaLabel}
                stroke="var(--primary)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Filtro ativo",
                  position: "top",
                  fill: "var(--primary)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Linha da Retenção */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="txDisplay"
              stroke="url(#txLineGrad)"
              strokeWidth={3}
              animationDuration={350}
              animationEasing="ease-out"
              dot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                const isBelow = payload.txDisplay < meta;
                const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                return (
                  <circle
                    key={`dot-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    stroke="var(--background)"
                    strokeWidth={2}
                    fill={dotColor}
                  />
                );
              }}
              activeDot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                const isBelow = payload.txDisplay < meta;
                const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                return (
                  <circle
                    key={`active-dot-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={7}
                    stroke="var(--background)"
                    strokeWidth={2}
                    fill={dotColor}
                  />
                );
              }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
