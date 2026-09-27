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
import type { HoraEvolucaoData, TemaHoraData } from "@/lib/retencao/get-evolucao-hora";
import type { ReactNode } from "react";

interface GraficoEvolucaoProps {
  dados: HoraEvolucaoData[];
  meta: number; // Meta de 0 a 100
  /** Slot à direita do título (ex.: engrenagem de configuração de metas). */
  acoes?: ReactNode;
}

// Rótulos das pontas do eixo ("< 08" / "≥ 20", vindos de get-evolucao-hora.ts)
// reescritos só pra EXIBIÇÃO — sem símbolos `<`/`≥`, mesma informação (hora
// bucket agrupa a hora cheia INTEIRA, ex.: "09" = 09:00 a 09:59). O dado em
// si (`label` original) não muda, só o texto mostrado no eixo/tooltip.
function formatEixoLabel(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return label;
}

// Mesma ordenação do card "Retenção por Tema": maior tx primeiro.
function ordenarPorTema(temas: TemaHoraData[]): TemaHoraData[] {
  return [...temas].sort((a, b) => {
    if (a.tx === null && b.tx === null) return 0;
    if (a.tx === null) return 1;
    if (b.tx === null) return -1;
    return b.tx - a.tx;
  });
}

export function GraficoEvolucao({ dados, meta, acoes }: GraficoEvolucaoProps) {
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

  return (
    <div className="space-y-3">
      {/* ── Título fora do card ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground">
            Evolução de Taxa e Pedidos da Equipe
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Taxa de retenção e volume de atendimentos por hora — cada hora do eixo agrupa o intervalo inteiro (ex.: &quot;09&quot; = 09:00 a 09:59).
          </p>
        </div>
        {acoes && <div className="shrink-0">{acoes}</div>}
      </div>

      {/* Container do gráfico removido a pedido (sem StyledCard/borda) —
          só o wrapper com a altura fixa que o ResponsiveContainer precisa. */}
      <div className="w-full h-[280px]">
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
              tickFormatter={formatEixoLabel}
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
                const temasOrdenados = ordenarPorTema(info.porTema ?? []);
                return (
                  <div className="bg-popover border border-border/80 rounded-lg p-3 shadow-md space-y-1.5 font-sans">
                    <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Hora: {formatEixoLabel(info.label)}
                    </p>
                    <div className="h-px bg-border/60 my-1" />
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

                    {temasOrdenados.length > 0 && (
                      <>
                        <div className="h-px bg-border/60 my-1" />
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                          Retenção por Tema
                        </p>
                        {temasOrdenados.map((tema) => (
                          <p key={tema.motivo} className="text-xs text-muted-foreground">
                            {tema.motivo}:{" "}
                            <strong className={tema.tx !== null && tema.tx * 100 < meta ? "text-danger" : "text-success"}>
                              {tema.tx !== null ? `${(tema.tx * 100).toFixed(1)}%` : "—"}
                            </strong>
                          </p>
                        ))}
                      </>
                    )}
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
              stroke="var(--border)"
              strokeDasharray="4 4"
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
