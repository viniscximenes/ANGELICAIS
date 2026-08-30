"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { foraDeOperacao } from "@/lib/kpi/analise-operadores/meta-status";
import type { KpiSerie, PontoSerie } from "@/lib/kpi/analise-operadores/serial-types";

import { useChartColors } from "./use-chart-colors";

/**
 * Gráfico compacto (500×180, sem card/header/fundo do site) capturado como
 * imagem e colado no PDF. Mesma coloração POR SEGMENTO (linear, sólida, sem
 * gradiente) do KpiPrincipalCard — mantida em sincronia manualmente com
 * `kpi-principal-card.tsx`. Cores sempre em tema claro (`useChartColors(true)`).
 */
const W = 500;
const H = 180;

type PontoXY = PontoSerie & { x: number };

export function PdfChart({ serie }: { serie: KpiSerie }) {
  const cores = useChartColors(true);
  const { pontos, metaLinha, valueType, direction } = serie;
  const n = pontos.length;

  const chartData: PontoXY[] = pontos.map((p, i) => ({ ...p, x: i }));
  const valoresPlot = pontos
    .map((p) => p.valorPlot)
    .filter((v): v is number => v !== null);

  let yDomain: [number, number] | [string, string] = ["auto", "auto"];
  if (valoresPlot.length > 0) {
    const lo = Math.min(...valoresPlot);
    const hi = Math.max(...valoresPlot);
    const amp = hi - lo;
    const pad = amp === 0 ? Math.max(Math.abs(hi) * 0.1, 1) : amp * 0.15;
    let dLo = lo - pad;
    let dHi = hi + pad;
    if (metaLinha !== null) {
      dLo = Math.min(dLo, metaLinha);
      dHi = Math.max(dHi, metaLinha);
    }
    if (valueType !== "percent_negative" && dLo < 0) dLo = 0;
    yDomain = [dLo, dHi];
  }

  const temMetaBinaria =
    metaLinha !== null &&
    (direction === "higher_better" || direction === "lower_better");
  const dentroDaMeta = (v: number) =>
    direction === "higher_better"
      ? v >= (metaLinha as number)
      : v <= (metaLinha as number);
  const corPonto = (v: number) =>
    temMetaBinaria
      ? dentroDaMeta(v)
        ? cores.success
        : cores.danger
      : cores.mutedFg;

  const idxPlot = pontos
    .map((p, i) => (p.valorPlot !== null ? i : -1))
    .filter((i) => i >= 0);

  type SubSeg = { pts: { x: number; y: number }[]; cor: string };
  const segmentos: SubSeg[] = [];
  for (let k = 0; k < idxPlot.length - 1; k++) {
    const ia = idxPlot[k];
    const ib = idxPlot[k + 1];
    const va = pontos[ia].valorPlot as number;
    const vb = pontos[ib].valorPlot as number;
    if (!temMetaBinaria) {
      segmentos.push({
        pts: [
          { x: ia, y: va },
          { x: ib, y: vb },
        ],
        cor: cores.mutedFg,
      });
      continue;
    }
    const da = dentroDaMeta(va);
    const db = dentroDaMeta(vb);
    const meta = metaLinha as number;
    if (da === db || va === vb) {
      segmentos.push({
        pts: [
          { x: ia, y: va },
          { x: ib, y: vb },
        ],
        cor: da ? cores.success : cores.danger,
      });
    } else {
      const t = (meta - va) / (vb - va);
      const xc = ia + t * (ib - ia);
      segmentos.push({
        pts: [
          { x: ia, y: va },
          { x: xc, y: meta },
        ],
        cor: da ? cores.success : cores.danger,
      });
      segmentos.push({
        pts: [
          { x: xc, y: meta },
          { x: ib, y: vb },
        ],
        cor: db ? cores.success : cores.danger,
      });
    }
  }

  let idxMax = -1;
  let idxMin = -1;
  for (const i of idxPlot) {
    const v = pontos[i].valorPlot as number;
    if (idxMax === -1 || v > (pontos[idxMax].valorPlot as number)) idxMax = i;
    if (idxMin === -1 || v < (pontos[idxMin].valorPlot as number)) idxMin = i;
  }
  const mesMax = idxMax >= 0 ? pontos[idxMax].mesRef : null;
  const mesMin = idxMin >= 0 ? pontos[idxMin].mesRef : null;

  const mesesForaOperacao = chartData.filter((p) =>
    foraDeOperacao(p.statusOperador),
  );

  const areaId = `pdfarea-${serie.slug}`;

  return (
    <ComposedChart
      width={W}
      height={H}
      data={chartData}
      margin={{ top: 16, right: 14, left: 2, bottom: 2 }}
    >
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cores.mutedFg} stopOpacity={0.1} />
          <stop offset="1" stopColor={cores.mutedFg} stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid
        vertical={false}
        stroke={cores.border}
        strokeOpacity={0.35}
      />

      <XAxis
        type="number"
        dataKey="x"
        domain={n > 1 ? [0, n - 1] : [-0.5, 0.5]}
        ticks={chartData.map((_, i) => i)}
        interval={0}
        tickFormatter={(i: number) => chartData[i]?.label ?? ""}
        tickLine={false}
        axisLine={false}
        tick={{ fill: cores.mutedFg, fontSize: 10 }}
      />
      <YAxis
        width={58}
        domain={yDomain}
        tickFormatter={(v: number) => formatKpiValue(v, valueType)}
        tickLine={false}
        axisLine={false}
        tick={{ fill: cores.mutedFg, fontSize: 9 }}
      />

      <Area
        type="linear"
        dataKey="valorPlot"
        stroke="none"
        fill={`url(#${areaId})`}
        isAnimationActive={false}
        connectNulls
        activeDot={false}
      />

      {metaLinha !== null && (
        <ReferenceLine
          y={metaLinha}
          stroke={cores.mutedFg}
          strokeDasharray="6 4"
          strokeWidth={1.25}
        />
      )}

      {mesesForaOperacao.map((p) => (
        <ReferenceLine
          key={`fora-${p.mesRef}`}
          x={p.x}
          stroke={
            p.statusOperador === "desligado" ? cores.mutedFg : cores.warning
          }
          strokeDasharray="3 3"
          strokeWidth={1}
          label={{
            value: p.metaStatusRotulo ?? "",
            position: "top",
            fill:
              p.statusOperador === "desligado" ? cores.mutedFg : cores.warning,
            fontSize: 8,
            fontWeight: 700,
          }}
        />
      ))}

      {segmentos.map((seg, i) => (
        <Line
          key={`seg-${i}`}
          data={seg.pts}
          dataKey="y"
          type="linear"
          stroke={seg.cor}
          strokeWidth={2.5}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          legendType="none"
          tooltipType="none"
        />
      ))}

      <Line
        dataKey="valorPlot"
        stroke="transparent"
        strokeWidth={0}
        isAnimationActive={false}
        connectNulls
        dot={(props: { cx?: number; cy?: number; payload?: PontoXY }) => {
          const { cx, cy, payload } = props;
          if (
            cx === undefined ||
            cy === undefined ||
            !payload ||
            payload.valorPlot === null
          ) {
            return <g key={`empty-${props.cx}-${props.cy}`} />;
          }
          const ehExtremo =
            payload.mesRef === mesMax || payload.mesRef === mesMin;
          return (
            <circle
              key={`dot-${payload.mesRef}`}
              cx={cx}
              cy={cy}
              r={ehExtremo ? 4 : 2.75}
              stroke="#ffffff"
              strokeWidth={1.5}
              fill={corPonto(payload.valorPlot)}
            />
          );
        }}
        activeDot={false}
      />
    </ComposedChart>
  );
}
