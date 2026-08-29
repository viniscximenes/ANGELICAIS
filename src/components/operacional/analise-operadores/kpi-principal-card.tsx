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
  const gradId = `g-${rawId}`;
  const areaId = `a-${rawId}`;

  const { pontos, metaLinha, valueType, direction, displayName } = serie;

  const valoresValidos = pontos
    .map((p) => p.valor)
    .filter((v): v is number => v !== null);

  // ── Cabeçalho: MÉDIA do período (item 7) ────────────────────────────
  const media =
    valoresValidos.length > 0
      ? valoresValidos.reduce((a, b) => a + b, 0) / valoresValidos.length
      : null;
  const statusMedia = statusDaMedia(media, metaLinha, direction);

  // ── Domínio dinâmico do eixo Y (item 4) ────────────────────────────
  // Padding proporcional à amplitude REAL dos pontos — faz a variação de
  // poucos pontos aparecer mesmo em janelas curtas. A meta só estica a
  // borda (sem ganhar padding), pra ReferenceLine continuar visível.
  let yDomain: [number, number] | [string, string] = ["auto", "auto"];
  if (valoresValidos.length > 0) {
    const lo = Math.min(...valoresValidos);
    const hi = Math.max(...valoresValidos);
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

  // ── Gradiente vertical que troca de cor na meta (stroke da linha) ──
  let stops: { offset: number; cor: string }[] | null = null;
  if (metaLinha !== null && valoresValidos.length > 0) {
    const dataMax = Math.max(...valoresValidos, metaLinha);
    const dataMin = Math.min(...valoresValidos, metaLinha);
    let offset =
      dataMax === dataMin ? 0.5 : (dataMax - metaLinha) / (dataMax - dataMin);
    offset = Math.min(1, Math.max(0, offset));
    const corTopo = direction === "higher_better" ? cores.success : cores.danger;
    const corBase = direction === "higher_better" ? cores.danger : cores.success;
    stops = [
      { offset: 0, cor: corTopo },
      { offset, cor: corTopo },
      { offset, cor: corBase },
      { offset: 1, cor: corBase },
    ];
  }
  // SVG <paint>: "url(#x) <cor>" só é válido com url() como 1º token.
  const strokeLinha = stops ? `url(#${gradId}) ${cores.mutedFg}` : cores.mutedFg;
  const corArea = corDoStatus(statusMedia, cores);

  // ── Marcadores de máximo e mínimo do período (item 4) ─────────────
  let idxMax = -1;
  let idxMin = -1;
  pontos.forEach((p, i) => {
    if (p.valor === null) return;
    if (idxMax === -1 || p.valor > (pontos[idxMax].valor ?? -Infinity)) idxMax = i;
    if (idxMin === -1 || p.valor < (pontos[idxMin].valor ?? Infinity)) idxMin = i;
  });
  const mesMax = idxMax >= 0 ? pontos[idxMax].mesRef : null;
  const mesMin = idxMin >= 0 ? pontos[idxMin].mesRef : null;

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
              margin={{ top: 12, right: 16, left: -4, bottom: 0 }}
            >
              <defs>
                {stops && (
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    {stops.map((s, i) => (
                      <stop key={i} offset={s.offset} stopColor={s.cor} />
                    ))}
                  </linearGradient>
                )}
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={corArea} stopOpacity={0.26} />
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
                      {serie.temQuartil && (
                        <p className="text-muted-foreground text-xs">
                          Quartil:{" "}
                          <strong className="text-foreground">
                            {p.quartil ? `Q${p.quartil}` : "—"}
                          </strong>
                        </p>
                      )}
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="valor"
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
                  label={{
                    value: `Meta ${formatKpiValue(metaLinha, valueType)}`,
                    position: "insideTopRight",
                    fill: cores.mutedFg,
                    fontSize: 11,
                    fontWeight: 700,
                    dy: -4,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="valor"
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
                    payload.valor === null
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
