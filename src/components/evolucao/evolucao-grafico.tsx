"use client";

import { useEffect, useRef } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMesCurto, formatValorIndicador } from "@/lib/evolucao/format";
import { INDICADOR_LABEL } from "@/lib/evolucao/types";
import type { SerieIndicador } from "@/lib/evolucao/types";

interface Props {
  serie: SerieIndicador;
}

// Largura mínima por ponto. Abaixo disso os meses ficariam comprimidos demais;
// acima da largura do container, o eixo rola horizontalmente.
const MIN_POINT_WIDTH = 80;
const CHART_HEIGHT = 320;

// Margens do LineChart e largura do eixo Y. Centralizados pra manter o cálculo
// de innerWidth em sincronia com o que o gráfico realmente reserva.
const CHART_MARGIN = { top: 30, right: 30, left: 10, bottom: 5 } as const;
const Y_AXIS_WIDTH = 70;

// Largura fora da área plotável (eixo Y + margens esquerda/direita). É somada
// à largura dos pontos pra que cada mês mantenha ~MIN_POINT_WIDTH na área
// plotável e o primeiro/último ponto (+ label) não colem nas bordas.
const HORIZONTAL_CHROME = Y_AXIS_WIDTH + CHART_MARGIN.left + CHART_MARGIN.right;

// Arredonda um intervalo pro "número bonito" mais próximo (algoritmo clássico
// de nice-ticks). round=true escolhe o passo; round=false a amplitude.
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let niceFrac: number;
  if (round) {
    if (frac < 1.5) niceFrac = 1;
    else if (frac < 3) niceFrac = 2;
    else if (frac < 7) niceFrac = 5;
    else niceFrac = 10;
  } else {
    if (frac <= 1) niceFrac = 1;
    else if (frac <= 2) niceFrac = 2;
    else if (frac <= 5) niceFrac = 5;
    else niceFrac = 10;
  }
  return niceFrac * Math.pow(10, exp);
}

/**
 * Domínio + ticks do eixo Y a partir da faixa REAL dos valores do indicador
 * ativo, com respiro. Faz auto-zoom (não ancora no zero) pra que variações
 * estreitas (ABS, TMA, Indisp) fiquem visíveis, e garante headroom no topo
 * pra linha/label de Pedidos não cortar. Recalculado por indicador (a `serie`
 * muda a cada tab). Retorna null se não há valores (deixa o Recharts no auto).
 */
function computeYScale(
  valores: number[],
): { domain: [number, number]; ticks: number[] } | null {
  if (valores.length === 0) return null;

  let min = Math.min(...valores);
  let max = Math.max(...valores);

  if (min === max) {
    // Valor único: janela artificial em volta (evita linha colada na borda).
    const pad = Math.abs(max) * 0.1 || 1;
    min -= pad;
    max += pad;
  } else {
    // 15% de respiro em cima e embaixo.
    const margem = (max - min) * 0.15;
    min -= margem;
    max += margem;
  }

  // Arredonda pra fora → ticks limpos e headroom garantido (niceMin <= min,
  // niceMax >= max), então nenhum ponto/label encosta na borda.
  const step = niceNum((max - min) / 4, true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + step / 2; t += step) {
    ticks.push(Number(t.toFixed(6)));
  }

  return { domain: [niceMin, niceMax], ticks };
}

type TooltipPayloadItem = {
  value: number | null;
  payload?: { status: string | null; inativo: boolean };
};

function ChartTooltip({
  active,
  payload,
  label,
  indicador,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  indicador: SerieIndicador["indicador"];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const valor = item?.value ?? null;
  const inativo = item?.payload?.inativo ?? false;
  const status = item?.payload?.status ?? null;
  return (
    <div
      className="elevation-2 rounded-md px-3 py-2"
      style={{ border: "1px solid var(--border)" }}
    >
      <p className="ds-mono-sm text-muted-foreground">{label}</p>
      <p className="ds-mono" style={{ color: "var(--foreground)" }}>
        {formatValorIndicador(indicador, valor)}
      </p>
      {inativo && (
        <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
          {status ?? "Inativo"} — fora do consolidado
        </p>
      )}
    </div>
  );
}

// Dot da série. Meses em que o operador não estava ativo (férias, licença…)
// ganham cor de alerta pra explicar visualmente a queda — o ponto continua
// na linha (mostra a realidade), só é sinalizado.
function EvolucaoDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: { valor: number | null; inativo: boolean };
}) {
  const { cx, cy, index, payload } = props;
  if (cx == null || cy == null || payload?.valor == null) return null;
  const inativo = payload.inativo;
  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={inativo ? 5 : 4}
      fill={inativo ? "var(--warning)" : "var(--primary)"}
      stroke="var(--background)"
      strokeWidth={2}
    />
  );
}

export function EvolucaoGrafico({ serie }: Props) {
  const data = serie.pontos.map((p) => ({
    mes: formatMesCurto(p.mesRef),
    valor: p.valor,
    status: p.status,
    inativo: p.statusInativo,
  }));

  const temInativo = serie.pontos.some((p) => p.statusInativo);

  // Auto-zoom do eixo Y na faixa real do indicador ativo.
  const valores = serie.pontos
    .map((p) => p.valor)
    .filter((v): v is number => v !== null);
  const yScale = computeYScale(valores);

  // Largura total do gráfico = pontos × largura mínima + chrome (eixo Y +
  // margens). Garante área plotável de ~80px por mês mesmo com o eixo Y
  // ocupando espaço, então o último segmento (→ Jun) tem onde ser desenhado.
  const innerWidth = `${
    serie.pontos.length * MIN_POINT_WIDTH + HORIZONTAL_CHROME
  }px`;

  // Inicia a rolagem nos meses mais RECENTES (ponta direita do eixo). Quando
  // não há overflow, scrollWidth ≈ clientWidth e isso é inócuo. rAF garante
  // que o ResponsiveContainer já assentou a largura final antes de medir.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [serie.pontos.length]);

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <h3 className="ds-h2" style={{ fontSize: "1.1rem" }}>
        {INDICADOR_LABEL[serie.indicador]}
      </h3>

      {/* Container externo rola; o gráfico ocupa pelo menos 100% e cresce
          conforme o número de meses (largura mínima por ponto). */}
      <div ref={scrollRef} className="scrollbar-tema overflow-x-auto">
        <div style={{ width: innerWidth, minWidth: "100%", height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />

              <XAxis
                dataKey="mes"
                stroke="var(--muted-foreground)"
                tick={{
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono)",
                  fill: "var(--foreground)",
                }}
                tickMargin={8}
                padding={{ left: 20, right: 20 }}
              />

              <YAxis
                stroke="var(--muted-foreground)"
                domain={yScale ? yScale.domain : undefined}
                ticks={yScale ? yScale.ticks : undefined}
                allowDecimals
                tick={{
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono)",
                  fill: "var(--foreground)",
                }}
                tickFormatter={(v) =>
                  typeof v === "number"
                    ? formatValorIndicador(serie.indicador, v)
                    : ""
                }
                tickMargin={4}
                width={Y_AXIS_WIDTH}
              />

              <Tooltip
                content={
                  <ChartTooltip indicador={serie.indicador} />
                }
              />

              <Line
                type="monotone"
                dataKey="valor"
                stroke="var(--primary)"
                strokeWidth={2.5}
                connectNulls
                dot={EvolucaoDot}
                activeDot={{ r: 6 }}
                // Sem animação de "desenho": o draw via stroke-dasharray usa o
                // comprimento do path medido num render anterior (mais estreito,
                // por causa do overflow-x-auto + minWidth:100%), trava nesse
                // valor e o último trecho (penúltimo→último mês) nunca chega a
                // ser desenhado — o dot aparece, a linha não. Desligar garante
                // a linha completa.
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="valor"
                  position="top"
                  offset={12}
                  formatter={(v) =>
                    typeof v === "number"
                      ? formatValorIndicador(serie.indicador, v)
                      : ""
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

      {temInativo && (
        <p className="ds-mono-sm flex items-center gap-1.5 text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--warning)" }}
            aria-hidden="true"
          />
          Meses inativos (férias, licença…) não entram no consolidado.
        </p>
      )}
    </div>
  );
}
