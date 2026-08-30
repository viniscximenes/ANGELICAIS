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
import {
  foraDeOperacao,
  rotuloStatusOperadorMes,
} from "@/lib/kpi/analise-operadores/meta-status";
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

/** Semáforo simples da MÉDIA contra a meta (mesma regra binária de enrich-with-definitions). */
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

export function KpiPrincipalCard({
  serie,
  estatico = false,
  forceLight = false,
  acoes,
}: {
  serie: KpiSerie;
  /** Desliga animação — usado na captura offscreen do PDF/PNG, pra não capturar mid-frame. */
  estatico?: boolean;
  /** Resolve as cores contra o tema claro (captura). */
  forceLight?: boolean;
  /** Slot à direita do título (ex.: engrenagem de meta). Omitido na captura. */
  acoes?: ReactNode;
}) {
  const cores = useChartColors(forceLight);
  const rawId = useId().replace(/[:]/g, "");
  const segId = `seg-${rawId}`;
  const areaId = `a-${rawId}`;

  const { pontos, metaLinha, valueType, direction, displayName } = serie;

  // Meses fora de operação (férias/afastamento/desligado) não entram em
  // média nem no gráfico — só no tooltip. `valorPlot` já vem null nesses.
  const valoresPlot = pontos
    .map((p) => p.valorPlot)
    .filter((v): v is number => v !== null);

  // ── Cabeçalho: MÉDIA do período ────────────────────────────────────
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

  // ── Coloração POR SEGMENTO pelo status de cada ponto ──────────────
  // Gradiente HORIZONTAL (eixo X): um stop por ponto plotado, com troca
  // seca no ponto médio entre pontos de status diferente. Cobre todo o
  // span de pontos plotados (até o último dado real).
  const idxPlot = pontos
    .map((p, i) => (p.valorPlot !== null ? i : -1))
    .filter((i) => i >= 0);
  const first = idxPlot[0] ?? 0;
  const last = idxPlot[idxPlot.length - 1] ?? 0;
  const span = last - first || 1;
  const frac = (i: number) => (i - first) / span;

  const segStops: { offset: number; cor: string }[] = [];
  idxPlot.forEach((i, k) => {
    const cor = corDoStatus(pontos[i].status, cores);
    if (k > 0) {
      const prev = idxPlot[k - 1];
      const corPrev = corDoStatus(pontos[prev].status, cores);
      if (corPrev !== cor) {
        const mid = (frac(prev) + frac(i)) / 2;
        segStops.push({ offset: mid, cor: corPrev });
        segStops.push({ offset: mid, cor });
      }
    }
    segStops.push({ offset: frac(i), cor });
  });

  const strokeLinha =
    idxPlot.length >= 2
      ? `url(#${segId})`
      : idxPlot.length === 1
        ? corDoStatus(pontos[idxPlot[0]].status, cores)
        : cores.mutedFg;
  const corArea = corDoStatus(statusMedia, cores);

  // ── Marcadores de máx/mín (só entre pontos plotados) ──────────────
  let idxMax = -1;
  let idxMin = -1;
  for (const i of idxPlot) {
    const v = pontos[i].valorPlot as number;
    if (idxMax === -1 || v > (pontos[idxMax].valorPlot as number)) idxMax = i;
    if (idxMin === -1 || v < (pontos[idxMin].valorPlot as number)) idxMin = i;
  }
  const mesMax = idxMax >= 0 ? pontos[idxMax].mesRef : null;
  const mesMin = idxMin >= 0 ? pontos[idxMin].mesRef : null;

  const mesesForaOperacao = pontos.filter((p) => foraDeOperacao(p.statusOperador));

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
              data={pontos}
              margin={{ top: 14, right: 16, left: -4, bottom: 0 }}
            >
              <defs>
                {idxPlot.length >= 2 && (
                  <linearGradient id={segId} x1="0" y1="0" x2="1" y2="0">
                    {segStops.map((s, i) => (
                      <stop
                        key={i}
                        offset={Math.min(1, Math.max(0, s.offset))}
                        stopColor={s.cor}
                      />
                    ))}
                  </linearGradient>
                )}
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={corArea} stopOpacity={0.24} />
                  <stop offset="1" stopColor={corArea} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke={cores.border}
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
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
                  const p = payload[0].payload as PontoSerie;
                  const rotuloFora = rotuloStatusOperadorMes(p.statusOperador);
                  const extremo =
                    p.mesRef === mesMax
                      ? " · máx do período"
                      : p.mesRef === mesMin
                        ? " · mín do período"
                        : "";
                  return (
                    <div className="bg-popover border-border/80 space-y-1 rounded-lg border p-3 font-sans shadow-md">
                      <p className="text-foreground text-[11px] font-semibold tracking-wider uppercase">
                        {p.label}
                        {extremo}
                      </p>
                      <div className="bg-border/60 my-1 h-px" />
                      <p className="text-muted-foreground text-xs">
                        {displayName}:{" "}
                        <strong className={classeTextoStatus(p.status)}>
                          {formatKpiValue(p.valor, valueType)}
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
                              {p.quartil ? `Q${p.quartil}` : "—"}
                            </strong>
                          </p>
                        )
                      )}
                    </div>
                  );
                }}
              />

              {/* Série invisível com o valor BRUTO (inclui meses fora de
                  operação) só para alimentar o tooltip nesses meses. */}
              <Line
                type="monotone"
                dataKey="valor"
                stroke="transparent"
                strokeWidth={0}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />

              <Area
                type="monotone"
                dataKey="valorPlot"
                stroke="none"
                fill={`url(#${areaId})`}
                isAnimationActive={!estatico}
                animationDuration={estatico ? 0 : 350}
                connectNulls
                activeDot={false}
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
                  x={p.label}
                  stroke={
                    p.statusOperador === "desligado"
                      ? cores.mutedFg
                      : cores.warning
                  }
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: rotuloStatusOperadorMes(p.statusOperador) ?? "",
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

              <Line
                type="monotone"
                dataKey="valorPlot"
                stroke={strokeLinha}
                strokeWidth={3}
                isAnimationActive={!estatico}
                animationDuration={estatico ? 0 : 350}
                animationEasing="ease-out"
                connectNulls
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: PontoSerie;
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
                  const cor = corDoStatus(payload.status, cores);
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
