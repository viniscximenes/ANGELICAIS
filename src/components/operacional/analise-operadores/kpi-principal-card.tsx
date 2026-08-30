"use client";

import { useId, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { foraDeOperacao } from "@/lib/kpi/analise-operadores/meta-status";
import type { KpiSerie, PontoSerie } from "@/lib/kpi/analise-operadores/serial-types";

import { QuartilFaixa } from "./quartil-faixa";
import { useChartColors, type ChartColors } from "./use-chart-colors";

type StatusKpi = PontoSerie["status"];

function corDoStatus(status: StatusKpi, cores: ChartColors): string {
  if (status === "success") return cores.success;
  if (status === "danger") return cores.danger;
  if (status === "warning") return cores.warning;
  return cores.mutedFg;
}

function classeTextoStatus(status: StatusKpi): string {
  if (status === "success") return "text-success";
  if (status === "danger") return "text-danger";
  if (status === "warning") return "text-[var(--warning)]";
  return "text-foreground";
}

function statusDaMedia(
  media: number | null,
  metaLinha: number | null,
  direction: KpiSerie["direction"],
): StatusKpi {
  if (media === null || metaLinha === null) return "neutral";
  if (direction === "higher_better") return media >= metaLinha ? "success" : "danger";
  if (direction === "lower_better") return media <= metaLinha ? "success" : "danger";
  return "neutral";
}

type PontoXY = PontoSerie & { x: number };

export function KpiPrincipalCard({
  serie,
  estatico = false,
  forceLight = false,
  acoes,
}: {
  serie: KpiSerie;
  estatico?: boolean;
  forceLight?: boolean;
  acoes?: ReactNode;
}) {
  const cores = useChartColors(forceLight);
  const areaId = `area-${useId().replace(/[:]/g, "")}`;

  const { pontos, metaLinha, valueType, direction, displayName } = serie;
  const n = pontos.length;

  const chartData: PontoXY[] = pontos.map((p, i) => ({ ...p, x: i }));

  const valoresPlot = pontos
    .map((p) => p.valorPlot)
    .filter((v): v is number => v !== null);

  // ── Média do período (ignora meses fora de operação) ──────────────
  const media =
    valoresPlot.length > 0
      ? valoresPlot.reduce((a, b) => a + b, 0) / valoresPlot.length
      : null;
  const statusMedia = statusDaMedia(media, metaLinha, direction);

  // ── Domínio dinâmico do eixo Y ────────────────────────────────────
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

  // ── Coloração da linha: type="linear", segmento a segmento ────────
  // Para cada par de pontos plotados consecutivos, se o segmento cruza a
  // meta (mudança de sinal de valor-meta), quebra no ponto de cruzamento
  // exato (interpolação linear) — dois sub-segmentos SÓLIDOS, um verde
  // (dentro da meta) e um vermelho (fora). Sem gradiente. type="linear"
  // garante que a reta desenhada coincide com a interpolação usada aqui.
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
      // t no eixo X (0..1) onde a reta va→vb cruza `meta`.
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

  const corArea = corDoStatus(statusMedia, cores);

  // ── Máx / mín entre pontos plotados ──────────────────────────────
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

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="ds-h3 text-foreground font-semibold">{displayName}</h3>
            {acoes}
          </div>
          <p className="ds-small text-muted-foreground mt-0.5 text-xs">
            {metaLinha !== null
              ? `Meta: ${formatKpiValue(metaLinha, valueType)}`
              : "Histórico mensal"}
          </p>
        </div>
        {media !== null && (
          <div className="text-right">
            <p
              className={`ds-display text-2xl font-semibold tabular-nums ${classeTextoStatus(
                statusMedia,
              )}`}
            >
              {formatKpiValue(media, valueType)}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              média
            </p>
          </div>
        )}
      </div>

      <StyledCard className="p-5" withGradient>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 14, left: -4, bottom: 0 }}
            >
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={corArea} stopOpacity={0.22} />
                  <stop offset="1" stopColor={corArea} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Grade SÓLIDA e discreta (mesmo valor nos dois temas). A
                  única linha tracejada do gráfico é a ReferenceLine da meta
                  — antes a grade também era tracejada e competia com ela
                  (bem visível no tema escuro). */}
              <CartesianGrid
                vertical={false}
                stroke={cores.border}
                strokeOpacity={0.35}
              />

              <XAxis
                type="number"
                dataKey="x"
                // Domínio EXATO [0, n-1]: 1º ponto rente à esquerda, último
                // rente à direita, independente de n (3/6/12). O respiro
                // para as bolinhas das pontas vem da `margin` em px (fixa),
                // não de padding no domínio — que seria proporcionalmente
                // enorme com poucos pontos e deixava vazio à esquerda.
                domain={n > 1 ? [0, n - 1] : [-0.5, 0.5]}
                ticks={chartData.map((_, i) => i)}
                interval={0}
                tickFormatter={(i: number) => chartData[i]?.label ?? ""}
                tickLine={false}
                axisLine={false}
                tick={{ fill: cores.mutedFg, fontSize: 11 }}
              />

              <YAxis
                width={70}
                domain={yDomain}
                tickFormatter={(v: number) => formatKpiValue(v, valueType)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: cores.mutedFg, fontSize: 10 }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const pt = payload.find(
                    (pp) =>
                      pp.payload &&
                      (pp.payload as Partial<PontoSerie>).mesRef !== undefined,
                  )?.payload as PontoSerie | undefined;
                  if (!pt) return null;
                  const rotuloFora = pt.metaStatusRotulo;
                  const extremo =
                    pt.mesRef === mesMax
                      ? " · máx do período"
                      : pt.mesRef === mesMin
                        ? " · mín do período"
                        : "";
                  return (
                    <div className="bg-popover border-border/80 space-y-1 rounded-lg border p-3 font-sans shadow-md">
                      <p className="text-foreground text-[11px] font-semibold tracking-wider uppercase">
                        {pt.label}
                        {extremo}
                      </p>
                      <div className="bg-border/60 my-1 h-px" />
                      <p className="text-muted-foreground text-xs">
                        {displayName}:{" "}
                        <strong className={classeTextoStatus(pt.status)}>
                          {formatKpiValue(pt.valor, valueType)}
                        </strong>
                      </p>
                      {rotuloFora ? (
                        <p className="text-[var(--warning)] text-[11px]">
                          {rotuloFora} — fora da média e do quartil
                        </p>
                      ) : (
                        serie.temQuartil && (
                          <p className="text-muted-foreground text-xs">
                            Quartil:{" "}
                            <strong className="text-foreground">
                              {pt.quartil ? `Q${pt.quartil}` : "—"}
                            </strong>
                          </p>
                        )
                      )}
                    </div>
                  );
                }}
              />

              <Area
                type="linear"
                dataKey="valorPlot"
                stroke="none"
                fill={`url(#${areaId})`}
                isAnimationActive={!estatico}
                animationDuration={estatico ? 0 : 300}
                connectNulls
                activeDot={false}
                tooltipType="none"
              />

              {metaLinha !== null && (
                <ReferenceLine
                  y={metaLinha}
                  stroke={cores.mutedFg}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                />
              )}

              {mesesForaOperacao.map((p) => (
                <ReferenceLine
                  key={`fora-${p.mesRef}`}
                  x={p.x}
                  stroke={
                    p.statusOperador === "desligado"
                      ? cores.mutedFg
                      : cores.warning
                  }
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: p.metaStatusRotulo ?? "",
                    position: "top",
                    fill:
                      p.statusOperador === "desligado"
                        ? cores.mutedFg
                        : cores.warning,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
              ))}

              {/* Linha visível: um <Line> sólido por sub-segmento. */}
              {segmentos.map((seg, i) => (
                <Line
                  key={`seg-${i}`}
                  data={seg.pts}
                  dataKey="y"
                  type="linear"
                  stroke={seg.cor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  legendType="none"
                  tooltipType="none"
                />
              ))}

              {/* Série transparente sobre os dados brutos: dots + tooltip
                  (inclui meses fora de operação, cujo valorPlot é null). */}
              <Line
                dataKey="valor"
                stroke="transparent"
                strokeWidth={0}
                isAnimationActive={false}
                connectNulls
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: PontoXY;
                }) => {
                  const { cx, cy, payload } = props;
                  if (
                    cx === undefined ||
                    cy === undefined ||
                    !payload ||
                    payload.valorPlot === null
                  ) {
                    return <g key={`empty-${props.cx}-${props.cy}`} />;
                  }
                  const cor = corPonto(payload.valorPlot);
                  const ehExtremo =
                    payload.mesRef === mesMax || payload.mesRef === mesMin;
                  return (
                    <g key={`dot-${payload.mesRef}`}>
                      {ehExtremo && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={9}
                          fill="none"
                          stroke={cores.mutedFg}
                          strokeWidth={1.5}
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={ehExtremo ? 5.5 : 3.5}
                        stroke={cores.background}
                        strokeWidth={2}
                        fill={cor}
                      />
                    </g>
                  );
                }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {serie.temQuartil && (
          <div className="border-border/40 mt-4 border-t pt-4">
            <QuartilFaixa pontos={pontos} />
          </div>
        )}
      </StyledCard>
    </div>
  );
}
