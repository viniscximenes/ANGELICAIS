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
import { IconChartLine } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";

interface EvolucaoTmaChartProps {
  dados: TmaHoraData[];
  thresholdConfig: TmaThresholdConfig;
}

/**
 * "Evolução do TMA" — estrutura DUPLICADA deliberadamente de
 * grafico-evolucao.tsx (dashboard/retencao), não reaproveitada. Motivo:
 * generalizar o componente do Consolidado pra servir TMA exigiria mudar
 * labels, domínio do eixo esquerdo (lá é % fixo 0-100, aqui é segundos sem
 * teto), a lógica de cor (lá é sempre "maior é melhor", aqui depende de
 * `direction` — normalmente "lower_better") e o conteúdo do tooltip (lá
 * lista retenção por TEMA, aqui lista OPERADORES abaixo da meta) — mudanças
 * grandes o bastante no arquivo do Consolidado pra arriscar regressão lá.
 * Copiar a estrutura (mesmo ComposedChart, mesmos eixos, mesma técnica de
 * gradiente/Cell/dot) mantém o Consolidado 100% intocado.
 *
 * ⚠️ ATENÇÃO — NUNCA renderizar este componente dentro de [data-tma-png]
 * (o wrapper capturado por CopyTmaButton, em gestor-tma-section.tsx): o
 * tooltip lista e-mails em formato LITERAL (ver comentário abaixo), uma
 * exceção deliberada à regra de nome fantasia do resto do site, que só faz
 * sentido em tela (hover), nunca numa imagem exportada/compartilhada. Esta
 * seção (Analítico) já vive FORA daquele wrapper — se algum dia o alvo do
 * PNG for estendido pra incluir mais conteúdo da página, este gráfico deve
 * ficar de fora explicitamente.
 */
export function EvolucaoTmaChart({ dados, thresholdConfig }: EvolucaoTmaChartProps) {
  const chartData = dados;
  const threshold = thresholdConfig.threshold;

  const validValues = chartData
    .map((d) => d.tmaMedioSegundos)
    .filter((v): v is number => v !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : null;
  const dataMin = validValues.length > 0 ? Math.min(...validValues) : null;

  // Gradiente da linha: MESMA técnica de grafico-evolucao.tsx (stop dinâmico
  // na altura em que o valor cruza a meta), mas com os lados INVERTIDOS pra
  // "lower_better" (TMA: valor MAIOR = pior = topo do gráfico deve ficar
  // vermelho, não verde como na Retenção, que é "higher_better"). Sem
  // gradiente (linha sólida neutra) quando não há meta configurada ou os
  // dados não variam (dataMax === dataMin) — evita divisão por zero.
  const temGradiente = threshold !== null && dataMax !== null && dataMin !== null && dataMax !== dataMin;
  const topoEhBom = thresholdConfig.direction === "higher_better";
  const corTopo = topoEhBom ? "var(--success)" : "var(--danger)";
  const corBase = topoEhBom ? "var(--danger)" : "var(--success)";
  let gradientOffset = 0;
  if (temGradiente) {
    gradientOffset = Math.min(1, Math.max(0, (dataMax! - threshold!) / (dataMax! - dataMin!)));
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconChartLine size={20} className="text-foreground" />
          Evolução do TMA
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Acompanhe o TMA (linha) e o volume de atendimentos (barras) ao longo das horas. (das 09:00 as 09:59 seria referente as 09:00)
        </p>
      </div>

      <StyledCard className="p-5" withGradient>
        <div className="w-full h-[280px]">
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
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />

              <YAxis
                yAxisId="left"
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const info = payload[0].payload as TmaHoraData;
                  return (
                    <div className="bg-popover border border-border/80 rounded-lg p-3 shadow-md space-y-1.5 font-sans">
                      <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        Hora: {info.label}
                      </p>
                      <div className="h-px bg-border/60 my-1" />
                      <p className="text-xs text-muted-foreground">
                        TMA:{" "}
                        <strong className={info.status === "danger" ? "text-danger" : "text-success"}>
                          {formatKpiValue(info.tmaMedioSegundos, "time")}
                        </strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Atendimentos: <strong className="text-foreground">{info.total}</strong>
                      </p>

                      {info.abaixoDaMeta.length > 0 && (
                        <>
                          <div className="h-px bg-border/60 my-1" />
                          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                            Abaixo da meta
                          </p>
                          {/*
                            E-mail LITERAL (parte local, minúsculo) —
                            exceção DELIBERADA à regra de nome
                            fantasia/formatação do resto da página, só
                            pra este tooltip (hover em tela, nunca
                            capturado em PNG — ver comentário no topo do
                            arquivo). NÃO troque por
                            formatNomeProprio/deriveNomeOperador/nome
                            fantasia numa manutenção futura.
                          */}
                          {info.abaixoDaMeta.map((op) => (
                            <p key={op.emailLocal} className="text-xs text-muted-foreground">
                              {op.emailLocal} - {info.label}:{" "}
                              <strong className="text-danger">{formatKpiValue(op.tmaMedioSegundos, "time")}</strong>
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                  );
                }}
              />

              <Bar yAxisId="right" dataKey="total" barSize={30} radius={[4, 4, 0, 0]} animationDuration={300} animationEasing="ease-out">
                {chartData.map((entry, index) => {
                  const cellColor = entry.status === "danger" ? "var(--danger)" : "var(--success)";
                  return <Cell key={`cell-${index}`} fill={cellColor} opacity={0.15} />;
                })}
              </Bar>

              {threshold !== null && (
                <ReferenceLine
                  yAxisId="left"
                  y={threshold}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.8}
                  label={{
                    value: `Meta: ${formatKpiValue(threshold, "time")}`,
                    position: "insideBottomLeft",
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 5,
                  }}
                />
              )}

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tmaMedioSegundos"
                stroke={temGradiente ? "url(#tmaLineGrad)" : "var(--foreground)"}
                strokeWidth={3}
                animationDuration={350}
                animationEasing="ease-out"
                dot={(props: { cx?: number; cy?: number; payload?: TmaHoraData }) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy || payload?.tmaMedioSegundos === null || payload?.tmaMedioSegundos === undefined) return null;
                  const dotColor = payload.status === "danger" ? "var(--danger)" : payload.status === "success" ? "var(--success)" : "var(--foreground)";
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
                  const dotColor = payload.status === "danger" ? "var(--danger)" : payload.status === "success" ? "var(--success)" : "var(--foreground)";
                  return (
                    <circle
                      key={`active-dot-${payload.label}`}
                      cx={cx}
                      cy={cy}
                      r={7}
                      stroke="var(--background)"
                      strokeWidth={2}
                      fill={dotColor}
                    />
                  );
                }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </StyledCard>
    </div>
  );
}
