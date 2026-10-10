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

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { formatFaixaHora } from "@/components/dashboard/retencao/grafico-evolucao";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { classeStatusTma, corStatusTma, formatDistanciaMetaTma, formatEixoLabelTma } from "@/lib/tma/format-tma";
import type { TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";

interface EvolucaoTmaChartProps {
  dados: TmaHoraData[];
  thresholdConfig: TmaThresholdConfig;
}

/** Altura do gráfico — a mesma do "Evolução da equipe" do Consolidado. */
const ALTURA_GRAFICO = 380;

/** Recorta as horas vazias das pontas (antes do 1º e depois do último
 * atendimento) — mesma regra do "Evolução da equipe" do Consolidado. */
function recortarHoras(dados: TmaHoraData[]): TmaHoraData[] {
  const primeiro = dados.findIndex((h) => h.total > 0);
  if (primeiro === -1) return [];
  let ultimo = dados.length - 1;
  while (ultimo > primeiro && dados[ultimo].total === 0) ultimo--;
  return dados.slice(primeiro, ultimo + 1);
}

function Titulo() {
  return (
    <div>
      <h3 className="ds-h3 font-semibold text-foreground">Evolução da equipe</h3>
      <p className="ds-small text-muted-foreground mt-1">
        TMA e volume de atendimentos ao longo do dia. Cada hora representa o intervalo completo (ex.: 09h = 09:00 às 09:59).
      </p>
    </div>
  );
}

/** Abaixo disso, o TMA da hora é marcado como amostra pequena (mesmo piso do Consolidado). */
const MIN_ATENDIMENTOS_AMOSTRA = 10;

/**
 * Cursor do tooltip (linha vertical) que some em horas sem atendimento —
 * mesma técnica do Consolidado (CursorSemHorasVazias, grafico-evolucao.tsx).
 */
function CursorSemHorasVazias(props: {
  points?: { x: number; y: number }[];
  stroke?: string;
  payload?: { payload?: { total?: number } }[];
}) {
  const { points, stroke, payload } = props;
  if (!points || points.length < 2) return null;
  if (payload?.[0]?.payload?.total === 0) return null;
  return (
    <path
      d={`M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`}
      stroke={stroke}
      fill="none"
      pointerEvents="none"
      className="recharts-tooltip-cursor"
    />
  );
}

/**
 * "Evolução da equipe" do TMA — espelha o visual do gráfico "Evolução da
 * equipe" do Consolidado (grafico-evolucao.tsx com visualDetalhado): título +
 * observação, legenda, escala do eixo ajustada à faixa real, barras neutras
 * (volume), linha reta colorida pela meta, ponto vazado em amostra pequena e
 * tooltip ancorado no topo. Estrutura própria (não reaproveita o componente
 * do Consolidado): aqui o eixo é tempo (MM:SS, sem teto) e a cor depende de
 * `direction` (normalmente "lower_better").
 *
 * ⚠️ ATENÇÃO — NUNCA renderizar este componente dentro de [data-tma-png]
 * (o wrapper capturado por CopyTmaButton, em gestor-tma-section.tsx): o
 * tooltip lista e-mails em formato LITERAL, uma exceção deliberada à regra
 * de nome fantasia do resto do site, que só faz sentido em tela (hover),
 * nunca numa imagem exportada/compartilhada.
 */
export function EvolucaoTmaChart({ dados, thresholdConfig }: EvolucaoTmaChartProps) {
  const chartData = recortarHoras(dados);
  const threshold = thresholdConfig.threshold;

  const validValues = chartData
    .map((d) => d.tmaMedioSegundos)
    .filter((v): v is number => v !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : null;
  const dataMin = validValues.length > 0 ? Math.min(...validValues) : null;

  // Gradiente vertical da linha (stop na altura em que o valor cruza a meta),
  // com os lados conforme a direção: "lower_better" (TMA) = topo vermelho.
  const temGradiente = threshold !== null && dataMax !== null && dataMin !== null && dataMax !== dataMin;
  const topoEhBom = thresholdConfig.direction === "higher_better";
  const corTopo = topoEhBom ? "var(--success)" : "var(--danger)";
  const corBase = topoEhBom ? "var(--danger)" : "var(--success)";
  let gradientOffset = 0;
  if (temGradiente) {
    gradientOffset = Math.min(1, Math.max(0, (dataMax! - threshold!) / (dataMax! - dataMin!)));
  }
  // Sem gradiente (sem meta ou valor único): cor do status do único valor.
  const corLinhaSolida =
    dataMax !== null && threshold !== null
      ? (topoEhBom ? dataMax >= threshold : dataMax <= threshold)
        ? "var(--success)"
        : "var(--danger)"
      : "var(--foreground)";

  // ── Escala do TMA (mesma ideia do visualDetalhado do Consolidado) ──────
  // Domínio ajustado à faixa real (TMA e meta), com a faixa dos dados na
  // parte de cima do gráfico; a parte de baixo fica pras barras (eixo da
  // direita, escala automática). Passo em minutos redondos.
  const valoresEixo = [...validValues, ...(threshold !== null ? [threshold] : [])];
  let eixoTma: { domain: [number, number]; ticks: number[] } | null = null;
  if (valoresEixo.length > 0) {
    const minTma = Math.min(...valoresEixo);
    const maxTma = Math.max(...valoresEixo);
    const faixa = Math.max(maxTma - minTma, 120);
    const passo = faixa > 1200 ? 600 : faixa > 480 ? 300 : faixa > 240 ? 120 : 60;
    const topo = Math.ceil((maxTma + faixa * 0.15) / passo) * passo;
    const base = Math.max(0, Math.floor((minTma - faixa * 1.3) / passo) * passo);
    const ticks: number[] = [];
    const primeiraMarca = Math.max(base, Math.floor(minTma / passo) * passo);
    for (let v = primeiraMarca; v <= topo; v += passo) ticks.push(v);
    eixoTma = { domain: [base, topo], ticks };
  }

  // Sem atendimento com horário: o gráfico esqueleto parado (como no
  // Consolidado), com o título mantido.
  if (chartData.length === 0) {
    return (
      <div className="space-y-3">
        <Titulo />
        <GraficoVazio
          titulo="Sem atendimentos com horário"
          descricao="Ainda não há atendimentos com horário pra montar a evolução do dia."
          altura={320}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Título fora do card ─────────────────────────────────── */}
      <Titulo />

      {/* ── Legenda (mesma do Consolidado, adaptada ao TMA) ─────── */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="9" y2="4" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="9" y1="4" x2="17" y2="4" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          TMA
        </span>
        {threshold !== null && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            Meta {formatKpiValue(threshold, "time")}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)" }}
          />
          Atendimentos (eixo da direita)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
          </svg>
          Amostra pequena (menos de {MIN_ATENDIMENTOS_AMOSTRA} atendimentos)
        </span>
      </div>

      {/* Sem a borda de foco ao CLICAR no gráfico (o Recharts o deixa focável); pelo teclado (:focus-visible) ela aparece. */}
      <div
        className="grafico-evolucao-chart w-full [&_*:focus:not(:focus-visible)]:outline-none"
        style={{ height: ALTURA_GRAFICO }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            {temGradiente && (
              <defs>
                <linearGradient id="tmaLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={corTopo} />
                  <stop offset={gradientOffset} stopColor={corTopo} />
                  <stop offset={gradientOffset} stopColor={corBase} />
                  <stop offset={1} stopColor={corBase} />
                </linearGradient>
              </defs>
            )}

            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="4 4" />

            <XAxis
              dataKey="label"
              tickFormatter={formatEixoLabelTma}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />

            <YAxis
              yAxisId="left"
              {...(eixoTma ? { domain: eixoTma.domain, ticks: eixoTma.ticks } : {})}
              tickFormatter={(v: number) => formatKpiValue(v, "time")}
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

            <Tooltip
              // Hora sem atendimento não mostra tooltip nem a linha do cursor.
              cursor={<CursorSemHorasVazias />}
              // Ancorado no topo do gráfico (não é cortado pelo trilho).
              position={{ y: 0 }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const info = payload[0].payload as TmaHoraData;
                if (info.total === 0 || info.tmaMedioSegundos === null) return null;
                const cor = classeStatusTma(info.status);
                const foraDaMeta = [...info.abaixoDaMeta].sort(
                  (a, b) => (b.tmaMedioSegundos ?? 0) - (a.tmaMedioSegundos ?? 0),
                );

                return (
                  <div className="bg-popover border border-border/80 w-72 rounded-lg p-3 shadow-md font-sans">
                    <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                      {formatFaixaHora(info.label)}
                    </p>
                    <p className="mt-1 flex items-baseline gap-2 text-sm">
                      <span className={`font-semibold ${cor}`}>
                        {formatKpiValue(info.tmaMedioSegundos, "time")}
                      </span>
                      {threshold !== null && (
                        <span className={`text-xs ${cor}`}>
                          {formatDistanciaMetaTma(info.tmaMedioSegundos, threshold)}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {info.total} {info.total === 1 ? "atendimento" : "atendimentos"}
                    </p>

                    {foraDaMeta.length > 0 && (
                      <>
                        <div className="bg-border/60 my-2 h-px" />
                        <p className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
                          Operadores fora da meta
                        </p>
                        {/*
                          E-mail LITERAL (parte local, minúsculo) — exceção
                          DELIBERADA à regra de nome fantasia do resto da
                          página, só pra este tooltip (hover em tela, nunca
                          capturado em PNG — ver comentário no topo). NÃO
                          troque por nome fantasia numa manutenção futura.
                        */}
                        <ul className="space-y-0.5">
                          {foraDaMeta.map((op) => (
                            <li key={op.emailLocal} className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="text-foreground truncate">{op.emailLocal}</span>
                              <span className="text-danger shrink-0">
                                {formatKpiValue(op.tmaMedioSegundos, "time")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {info.total < MIN_ATENDIMENTOS_AMOSTRA && (
                      <p className="text-muted-foreground mt-2 text-[11px] italic">
                        Amostra pequena: poucos atendimentos nesta hora.
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Barras = volume, cor neutra (o verde/vermelho fica só na linha). */}
            <Bar
              yAxisId="right"
              dataKey="total"
              barSize={30}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="var(--muted-foreground)" opacity={0.14} />
              ))}
            </Bar>

            {threshold !== null && (
              <ReferenceLine
                yAxisId="left"
                y={threshold}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: `Meta: ${formatKpiValue(threshold, "time")}`,
                  // Topo-esquerda: a ponta direita colide com o último ponto
                  // da linha quando ele fica perto da meta.
                  position: "insideTopLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 5,
                }}
              />
            )}

            {/* Reta: dado por hora (sem valor entre uma hora e outra). */}
            <Line
              yAxisId="left"
              type="linear"
              dataKey="tmaMedioSegundos"
              stroke={temGradiente ? "url(#tmaLineGrad)" : corLinhaSolida}
              strokeWidth={3}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: TmaHoraData }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.tmaMedioSegundos === null || payload?.tmaMedioSegundos === undefined) return null;
                const dotColor = corStatusTma(payload.status);
                // Amostra pequena: ponto vazado (só contorno na cor do status).
                if (payload.total < MIN_ATENDIMENTOS_AMOSTRA) {
                  return (
                    <circle
                      key={`dot-${payload.label}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      stroke={dotColor}
                      strokeWidth={2}
                      fill="var(--background)"
                    />
                  );
                }
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
              activeDot={(props: { cx?: number; cy?: number; payload?: TmaHoraData }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.tmaMedioSegundos === null || payload?.tmaMedioSegundos === undefined) return null;
                return (
                  <circle
                    key={`active-dot-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={7}
                    stroke="var(--background)"
                    strokeWidth={2}
                    fill={corStatusTma(payload.status)}
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
