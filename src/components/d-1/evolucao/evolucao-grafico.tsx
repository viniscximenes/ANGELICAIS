"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { getColorForTx } from "@/lib/d1/evolucao/get-color-for-tx";
import type { EvolucaoSnapshot } from "@/lib/d1/evolucao/types";

interface Props {
  snapshots: EvolucaoSnapshot[];
}

type GradientStop = { offset: number; color: string };

/**
 * Calcula os stops do gradient da linha em função do min/max REAL dos
 * dados. Assim os limites das zonas (60% e 66%) caem nos offsets corretos
 * dentro da bounding box do path da linha — sem comprimir as cores quando
 * a amplitude é pequena.
 */
function computeGradientStops(data: { tx: number }[]): GradientStop[] {
  if (data.length === 0) return [];

  const txs = data.map((d) => d.tx);
  const minTx = Math.min(...txs);
  const maxTx = Math.max(...txs);

  if (minTx === maxTx) {
    const color = `var(--${getColorForTx(minTx)})`;
    return [
      { offset: 0, color },
      { offset: 100, color },
    ];
  }

  // Gradient vai de y1=0 (topo, valor maxTx) a y2=1 (base, valor minTx)
  const txToOffset = (tx: number) =>
    ((maxTx - tx) / (maxTx - minTx)) * 100;

  const stops: GradientStop[] = [];

  stops.push({ offset: 0, color: `var(--${getColorForTx(maxTx)})` });

  if (maxTx > 66 && minTx < 66) {
    const off = txToOffset(66);
    stops.push({ offset: off, color: "var(--success)" });
    stops.push({ offset: off, color: "var(--warning)" });
  }

  if (maxTx > 60 && minTx < 60) {
    const off = txToOffset(60);
    stops.push({ offset: off, color: "var(--warning)" });
    stops.push({ offset: off, color: "var(--danger)" });
  }

  stops.push({ offset: 100, color: `var(--${getColorForTx(minTx)})` });

  return stops;
}

export function EvolucaoGrafico({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    time: s.reportTime,
    tx: s.txValue,
    color: getColorForTx(s.txValue),
  }));

  const gradientStops = computeGradientStops(data);

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="ds-h2" style={{ fontSize: "1.125rem" }}>
            Evolução da TX
          </h3>
          <p className="ds-mono-sm text-muted-foreground">
            Snapshots do dia • {snapshots.length}{" "}
            {snapshots.length === 1 ? "ponto" : "pontos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="ds-mono-sm flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--success)" }}
              aria-hidden="true"
            />
            ≥ 66%
          </span>
          <span className="ds-mono-sm flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--warning)" }}
              aria-hidden="true"
            />
            60-66%
          </span>
          <span className="ds-mono-sm flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--danger)" }}
              aria-hidden="true"
            />
            &lt; 60%
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 30, right: 40, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient
                id="evolucaoGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                {gradientStops.map((stop, i) => (
                  <stop
                    key={i}
                    offset={`${stop.offset}%`}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            </defs>

            {/* Faixas de fundo (renderizam atrás de tudo) */}
            <ReferenceArea
              y1={30}
              y2={60}
              fill="var(--danger)"
              fillOpacity={0.06}
              stroke="none"
            />
            <ReferenceArea
              y1={60}
              y2={66}
              fill="var(--warning)"
              fillOpacity={0.08}
              stroke="none"
            />
            <ReferenceArea
              y1={66}
              y2={90}
              fill="var(--success)"
              fillOpacity={0.06}
              stroke="none"
            />

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />

            <XAxis
              dataKey="time"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
              tickMargin={8}
              padding={{ left: 30, right: 30 }}
            />

            <YAxis
              domain={[30, 90]}
              ticks={[30, 50, 60, 66, 80, 90]}
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
              tickFormatter={(v) => `${v}%`}
              tickMargin={4}
            />

            <ReferenceLine
              y={60}
              stroke="var(--foreground)"
              strokeDasharray="3 3"
              opacity={0.25}
            />

            <ReferenceLine
              y={66}
              stroke="var(--success)"
              strokeDasharray="3 3"
              opacity={0.3}
            />

            <Line
              type="monotone"
              dataKey="tx"
              stroke="url(#evolucaoGradient)"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const color = `var(--${getColorForTx(payload.tx)})`;
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={color}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={false}
              animationDuration={800}
            >
              <LabelList
                dataKey="tx"
                position="top"
                offset={12}
                formatter={(v) =>
                  typeof v === "number" ? `${v.toFixed(1)}%` : ""
                }
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono)",
                  fill: "var(--foreground)",
                  fontWeight: 500,
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
