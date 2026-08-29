"use client";

import { useId } from "react";
import {
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
import { useChartColors } from "./use-chart-colors";

type StatusKpi = PontoSerie["status"];

function corDoStatus(
  status: StatusKpi,
  cores: ReturnType<typeof useChartColors>,
): string {
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

export function KpiPrincipalCard({
  serie,
  estatico = false,
}: {
  serie: KpiSerie;
  /** Desliga animação — usado na captura offscreen do PDF, pra não capturar mid-frame. */
  estatico?: boolean;
}) {
  const cores = useChartColors();
  const gradId = useId().replace(/[:]/g, "");

  const { pontos, metaLinha, valueType, direction, displayName } = serie;

  const valoresValidos = pontos
    .map((p) => p.valor)
    .filter((v): v is number => v !== null);

  const ultimoComValor = [...pontos].reverse().find((p) => p.valor !== null);

  // Gradiente vertical que troca de cor na meta — mesmo mecanismo de
  // retencao/grafico-evolucao.tsx, com as cores JÁ resolvidas (useChartColors)
  // pro PNG não sair quebrado.
  let stops: { offset: number; cor: string }[] | null = null;
  if (metaLinha !== null && valoresValidos.length > 0) {
    const dataMax = Math.max(...valoresValidos, metaLinha);
    const dataMin = Math.min(...valoresValidos, metaLinha);
    let offset =
      dataMax === dataMin ? 0.5 : (dataMax - metaLinha) / (dataMax - dataMin);
    offset = Math.min(1, Math.max(0, offset));

    // higher_better → acima da meta (topo do gráfico) é verde;
    // lower_better → acima da meta é vermelho.
    const corTopo =
      direction === "higher_better" ? cores.success : cores.danger;
    const corBase =
      direction === "higher_better" ? cores.danger : cores.success;

    stops = [
      { offset: 0, cor: corTopo },
      { offset, cor: corTopo },
      { offset, cor: corBase },
      { offset: 1, cor: corBase },
    ];
  }

  const strokeLinha = stops ? `url(#${gradId})` : cores.mutedFg;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="ds-h3 text-foreground font-semibold">{displayName}</h3>
          <p className="ds-small text-muted-foreground mt-0.5 text-xs">
            {metaLinha !== null
              ? `Meta: ${formatKpiValue(metaLinha, valueType)}`
              : "Histórico mensal"}
          </p>
        </div>
        {ultimoComValor && (
          <div className="text-right">
            <p
              className={`ds-display text-2xl font-semibold tabular-nums ${classeTextoStatus(
                ultimoComValor.status,
              )}`}
            >
              {formatKpiValue(ultimoComValor.valor, valueType)}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {ultimoComValor.label}
            </p>
          </div>
        )}
      </div>

      <StyledCard className="p-5" withGradient>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={pontos}
              margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
            >
              <defs>
                {stops && (
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    {stops.map((s, i) => (
                      <stop key={i} offset={s.offset} stopColor={s.cor} />
                    ))}
                  </linearGradient>
                )}
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
                width={64}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => formatKpiValue(v, valueType)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: cores.mutedFg, fontSize: 10 }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as PontoSerie;
                  return (
                    <div className="bg-popover border-border/80 space-y-1 rounded-lg border p-3 font-sans shadow-md">
                      <p className="text-foreground text-[11px] font-semibold tracking-wider uppercase">
                        {p.label}
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

              {metaLinha !== null && (
                <ReferenceLine
                  y={metaLinha}
                  stroke={cores.border}
                  strokeDasharray="4 4"
                  strokeOpacity={0.8}
                  label={{
                    value: `Meta: ${formatKpiValue(metaLinha, valueType)}`,
                    position: "insideBottomLeft",
                    fill: cores.mutedFg,
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 5,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="valor"
                stroke={`${strokeLinha} ${cores.mutedFg}`}
                strokeWidth={2.5}
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
                  return (
                    <circle
                      key={`dot-${payload.mesRef}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      stroke={cores.background}
                      strokeWidth={2}
                      fill={corDoStatus(payload.status, cores)}
                    />
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
