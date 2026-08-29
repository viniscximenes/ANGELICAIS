"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { KpiSerie, PontoSerie } from "@/lib/kpi/analise-operadores/serial-types";

import { useChartColors } from "./use-chart-colors";

function classeTextoStatus(status: PontoSerie["status"]): string {
  if (status === "success") return "text-success";
  if (status === "danger") return "text-danger";
  if (status === "warning") return "text-[var(--warning)]";
  return "text-foreground";
}

function SecundarioCard({
  serie,
  forceLight,
}: {
  serie: KpiSerie;
  forceLight?: boolean;
}) {
  const cores = useChartColors(forceLight);
  const ultimo = [...serie.pontos].reverse().find((p) => p.valor !== null);
  const temSerie = serie.pontos.some((p) => p.valor !== null);

  const corLinha =
    ultimo?.status === "success"
      ? cores.success
      : ultimo?.status === "danger"
        ? cores.danger
        : ultimo?.status === "warning"
          ? cores.warning
          : cores.mutedFg;

  return (
    <StyledCard className="flex flex-col gap-2 p-4" withGradient corners="none">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {serie.displayName}
      </p>
      <p
        className={`ds-display text-lg font-semibold tabular-nums ${
          ultimo ? classeTextoStatus(ultimo.status) : "text-muted-foreground"
        }`}
      >
        {ultimo ? formatKpiValue(ultimo.valor, serie.valueType) : "—"}
      </p>
      <div className="h-8 w-full">
        {temSerie && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={serie.pontos}
              margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
            >
              <Line
                type="monotone"
                dataKey="valor"
                stroke={corLinha}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </StyledCard>
  );
}

export function KpiSecundariosGrid({
  series,
  forcarAberto = false,
  forceLight = false,
}: {
  series: KpiSerie[];
  /** Sempre expandido (captura do PDF/PNG). */
  forcarAberto?: boolean;
  /** Resolve cores da sparkline contra o tema claro (captura). */
  forceLight?: boolean;
}) {
  const [aberto, setAberto] = useState(forcarAberto);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase transition-colors"
        aria-expanded={aberto}
      >
        <IconChevronDown
          size={16}
          className={`transition-transform ${aberto ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
        KPIs secundários ({series.length})
      </button>

      {aberto && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {series.map((serie) => (
            <SecundarioCard
              key={serie.slug}
              serie={serie}
              forceLight={forceLight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
