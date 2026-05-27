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
  variant?: "screen" | "excel";
}

type ChartTheme = {
  bg: string;
  border: string;
  headerBg: string;
  headerColor: string;
  headerSubtitleColor: string;
  text: string;
  textMuted: string;
  gridLine: string;
  success: string;
  warning: string;
  danger: string;
  zoneSuccess: string;
  zoneWarning: string;
  zoneDanger: string;
  fontFamily: string;
  fontMono: string;
  dotStroke: string;
};

const SCREEN_THEME: ChartTheme = {
  bg: "transparent",
  border: "var(--border)",
  headerBg: "transparent",
  headerColor: "var(--foreground)",
  headerSubtitleColor: "var(--muted-foreground)",
  text: "var(--foreground)",
  textMuted: "var(--muted-foreground)",
  gridLine: "var(--border)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  zoneSuccess: "var(--success)",
  zoneWarning: "var(--warning)",
  zoneDanger: "var(--danger)",
  fontFamily: "inherit",
  fontMono: "var(--font-geist-mono)",
  dotStroke: "var(--background)",
};

const EXCEL_THEME: ChartTheme = {
  bg: "#ffffff",
  border: "#c0c0c0",
  headerBg: "#1f4e78",
  headerColor: "#ffffff",
  headerSubtitleColor: "#c0d4e8",
  text: "#000000",
  textMuted: "#4a5560",
  gridLine: "#d0d0d0",
  success: "#2e7d32",
  warning: "#ed6c02",
  danger: "#c62828",
  zoneSuccess: "#4caf50",
  zoneWarning: "#ff9800",
  zoneDanger: "#f44336",
  fontFamily: "'Segoe UI', 'Arial', sans-serif",
  fontMono: "'Consolas', 'Courier New', monospace",
  dotStroke: "#ffffff",
};

type GradientStop = { offset: number; color: string };

function colorForTxFromTheme(tx: number, theme: ChartTheme): string {
  const key = getColorForTx(tx);
  if (key === "success") return theme.success;
  if (key === "warning") return theme.warning;
  return theme.danger;
}

/**
 * Calcula os stops do gradient da linha em função do min/max REAL dos
 * dados. Assim os limites das zonas (60% e 66%) caem nos offsets corretos
 * dentro da bounding box do path da linha — sem comprimir as cores quando
 * a amplitude é pequena.
 */
function computeGradientStops(
  data: { tx: number }[],
  theme: ChartTheme,
): GradientStop[] {
  if (data.length === 0) return [];

  const txs = data.map((d) => d.tx);
  const minTx = Math.min(...txs);
  const maxTx = Math.max(...txs);

  if (minTx === maxTx) {
    const color = colorForTxFromTheme(minTx, theme);
    return [
      { offset: 0, color },
      { offset: 100, color },
    ];
  }

  const txToOffset = (tx: number) =>
    ((maxTx - tx) / (maxTx - minTx)) * 100;

  const stops: GradientStop[] = [];

  stops.push({ offset: 0, color: colorForTxFromTheme(maxTx, theme) });

  if (maxTx > 66 && minTx < 66) {
    const off = txToOffset(66);
    stops.push({ offset: off, color: theme.success });
    stops.push({ offset: off, color: theme.warning });
  }

  if (maxTx > 60 && minTx < 60) {
    const off = txToOffset(60);
    stops.push({ offset: off, color: theme.warning });
    stops.push({ offset: off, color: theme.danger });
  }

  stops.push({ offset: 100, color: colorForTxFromTheme(minTx, theme) });

  return stops;
}

export function EvolucaoGrafico({ snapshots, variant = "screen" }: Props) {
  const isExcel = variant === "excel";
  const theme = isExcel ? EXCEL_THEME : SCREEN_THEME;

  const data = snapshots.map((s) => ({
    time: s.reportTime,
    tx: s.txValue,
    color: getColorForTx(s.txValue),
  }));

  const gradientStops = computeGradientStops(data, theme);
  const gradientId = isExcel ? "evolucaoGradientExcel" : "evolucaoGradient";

  return (
    <div
      className={isExcel ? "" : "elevation-1 space-y-3 rounded-xl p-5"}
      style={
        isExcel
          ? {
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontFamily: theme.fontFamily,
              borderRadius: 0,
              boxShadow: "none",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <div
        className={
          isExcel ? "flex flex-wrap items-baseline justify-between gap-3" : "flex flex-wrap items-baseline justify-between gap-3"
        }
        style={
          isExcel
            ? {
                background: theme.headerBg,
                color: theme.headerColor,
                padding: "8px 16px",
                borderBottom: `1px solid ${theme.border}`,
              }
            : undefined
        }
      >
        <div>
          <h3
            className={isExcel ? "" : "ds-h2"}
            style={
              isExcel
                ? {
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: theme.headerColor,
                    margin: 0,
                  }
                : { fontSize: "1.125rem" }
            }
          >
            Evolução da TX
          </h3>
          <p
            className={isExcel ? "" : "ds-mono-sm text-muted-foreground"}
            style={
              isExcel
                ? {
                    fontSize: "11px",
                    color: theme.headerSubtitleColor,
                    fontFamily: theme.fontMono,
                    margin: "2px 0 0 0",
                  }
                : undefined
            }
          >
            Snapshots do dia • {snapshots.length}{" "}
            {snapshots.length === 1 ? "ponto" : "pontos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={isExcel ? "" : "ds-mono-sm flex items-center gap-1.5"}
            style={
              isExcel
                ? {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "10px",
                    fontFamily: theme.fontMono,
                    color: theme.headerColor,
                  }
                : undefined
            }
          >
            <span
              className={isExcel ? "" : "inline-block h-2 w-2 rounded-full"}
              style={
                isExcel
                  ? {
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: theme.zoneSuccess,
                    }
                  : { background: theme.zoneSuccess }
              }
              aria-hidden="true"
            />
            ≥ 66%
          </span>
          <span
            className={isExcel ? "" : "ds-mono-sm flex items-center gap-1.5"}
            style={
              isExcel
                ? {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "10px",
                    fontFamily: theme.fontMono,
                    color: theme.headerColor,
                  }
                : undefined
            }
          >
            <span
              className={isExcel ? "" : "inline-block h-2 w-2 rounded-full"}
              style={
                isExcel
                  ? {
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: theme.zoneWarning,
                    }
                  : { background: theme.zoneWarning }
              }
              aria-hidden="true"
            />
            60-66%
          </span>
          <span
            className={isExcel ? "" : "ds-mono-sm flex items-center gap-1.5"}
            style={
              isExcel
                ? {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "10px",
                    fontFamily: theme.fontMono,
                    color: theme.headerColor,
                  }
                : undefined
            }
          >
            <span
              className={isExcel ? "" : "inline-block h-2 w-2 rounded-full"}
              style={
                isExcel
                  ? {
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: theme.zoneDanger,
                    }
                  : { background: theme.zoneDanger }
              }
              aria-hidden="true"
            />
            &lt; 60%
          </span>
        </div>
      </div>

      <div
        style={
          isExcel
            ? {
                width: "100%",
                height: 280,
                background: theme.bg,
                padding: "12px 8px 4px 8px",
              }
            : { width: "100%", height: 280 }
        }
      >
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 30, right: 40, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                {gradientStops.map((stop, i) => (
                  <stop
                    key={i}
                    offset={`${stop.offset}%`}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            </defs>

            <ReferenceArea
              y1={30}
              y2={60}
              fill={theme.zoneDanger}
              fillOpacity={isExcel ? 0.14 : 0.06}
              stroke="none"
            />
            <ReferenceArea
              y1={60}
              y2={66}
              fill={theme.zoneWarning}
              fillOpacity={isExcel ? 0.2 : 0.08}
              stroke="none"
            />
            <ReferenceArea
              y1={66}
              y2={90}
              fill={theme.zoneSuccess}
              fillOpacity={isExcel ? 0.14 : 0.06}
              stroke="none"
            />

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridLine}
              opacity={isExcel ? 0.8 : 0.5}
            />

            <XAxis
              dataKey="time"
              stroke={theme.textMuted}
              tick={{
                fontSize: 11,
                fontFamily: theme.fontMono,
                fill: theme.text,
              }}
              tickMargin={8}
              padding={{ left: 30, right: 30 }}
            />

            <YAxis
              domain={[30, 90]}
              ticks={[30, 50, 60, 66, 80, 90]}
              stroke={theme.textMuted}
              tick={{
                fontSize: 11,
                fontFamily: theme.fontMono,
                fill: theme.text,
              }}
              tickFormatter={(v) => `${v}%`}
              tickMargin={4}
            />

            <ReferenceLine
              y={60}
              stroke={theme.text}
              strokeDasharray="3 3"
              opacity={isExcel ? 0.3 : 0.25}
            />

            <ReferenceLine
              y={66}
              stroke={theme.success}
              strokeDasharray="3 3"
              opacity={0.3}
            />

            <Line
              type="monotone"
              dataKey="tx"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const color = colorForTxFromTheme(payload.tx, theme);
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={color}
                    stroke={theme.dotStroke}
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
                  fontFamily: theme.fontMono,
                  fill: theme.text,
                  fontWeight: isExcel ? 600 : 500,
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
