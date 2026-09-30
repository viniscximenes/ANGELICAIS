"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FaixaAcumuladaData } from "@/lib/retencao/get-evolucao-acumulada";

/**
 * Visão ACUMULADA do gráfico "Evolução da equipe" (/s/reports/consolidado,
 * toggle "Acumulada" ao lado da engrenagem). Mesmo padrão visual do
 * GraficoEvolucao com `visualDetalhado` (legenda, barras neutras, meta
 * tracejada, eixo da taxa ajustado, ponto vazado em amostra pequena, linha
 * reta), mas com dados diferentes:
 * - faixas de 30 min, só as que têm atendimento (sem colunas vazias);
 * - linha = taxa acumulada do dia até o fim de cada faixa;
 * - barras = pedidos DA faixa (volume do período, não acumulado).
 */

interface GraficoEvolucaoAcumuladaProps {
  dados: FaixaAcumuladaData[];
  meta: number; // 0 a 100
  acoes?: ReactNode;
  titulo: string;
  descricao: string;
}

/** Abaixo disso (pedidos ACUMULADOS), a taxa ainda é pouco representativa. */
const MIN_PEDIDOS_AMOSTRA = 10;

/** Mesmo nome exibido no card "Divisor de Quartil": o login sem o domínio. */
function nomeOperador(login: string): string {
  return login.includes("@") ? login.split("@")[0] : login;
}


function pct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function GraficoEvolucaoAcumulada({
  dados,
  meta,
  acoes,
  titulo,
  descricao,
}: GraficoEvolucaoAcumuladaProps) {
  const chartData = dados.map((d) => ({
    ...d,
    txAcumDisplay: d.txAcum !== null ? parseFloat((d.txAcum * 100).toFixed(1)) : null,
    variacaoDisplay: d.variacao !== null ? parseFloat((d.variacao * 100).toFixed(1)) : null,
  }));

  const valoresTx = chartData.map((d) => d.txAcumDisplay).filter((v): v is number => v !== null);
  const dataMax = valoresTx.length > 0 ? Math.max(...valoresTx) : 100;
  const dataMin = valoresTx.length > 0 ? Math.min(...valoresTx) : 0;

  // Troca verde/vermelho exatamente onde a linha cruza a meta (mesma
  // técnica do GraficoEvolucao).
  let gradientOffset = 0;
  if (dataMax <= meta) gradientOffset = 0;
  else if (dataMin >= meta) gradientOffset = 1;
  else gradientOffset = (dataMax - meta) / (dataMax - dataMin);

  // Eixo da taxa ajustado à faixa real (mesma régua do GraficoEvolucao).
  const valoresTaxa = [...valoresTx, meta];
  const minTaxa = Math.min(...valoresTaxa);
  const maxTaxa = Math.max(...valoresTaxa);
  const faixa = Math.max(maxTaxa - minTaxa, 10);
  const passo = faixa > 40 ? 20 : 10;
  const topo = Math.min(100, Math.ceil((maxTaxa + faixa * 0.15) / passo) * passo);
  const base = Math.max(0, Math.floor((minTaxa - faixa * 1.3) / passo) * passo);
  const ticksTaxa: number[] = [];
  const primeiraMarca = Math.max(base, Math.floor(minTaxa / passo) * passo);
  for (let v = primeiraMarca; v <= topo; v += passo) ticksTaxa.push(v);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground">{titulo}</h3>
          <p className="ds-small text-muted-foreground mt-1">{descricao}</p>
        </div>
        {acoes && <div className="shrink-0">{acoes}</div>}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="9" y2="4" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="9" y1="4" x2="17" y2="4" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Taxa acumulada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
          Meta {meta.toFixed(0)}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)" }}
          />
          Pedidos na faixa (eixo da direita)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
          </svg>
          Amostra pequena (menos de {MIN_PEDIDOS_AMOSTRA} pedidos no acumulado)
        </span>
      </div>

      <div className="grafico-evolucao-chart w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="txAcumLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--danger)" />
                <stop offset={1} stopColor="var(--danger)" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="4 4" />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={12}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              domain={[base, topo]}
              ticks={ticksTaxa}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, opacity: 0.5 }}
            />

            <Tooltip
              // Ancorado no topo do gráfico: seguindo o cursor, a lista de
              // operadores passava da borda de baixo e era cortada pelo trilho
              // horizontal (overflow hidden). No topo ela cabe inteira.
              position={{ y: 0 }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const info = payload[0].payload as (typeof chartData)[0];
                const abaixo = info.txAcumDisplay !== null && info.txAcumDisplay < meta;
                const v = info.variacaoDisplay;
                // Quem puxou pra baixo: só quando a acumulada CAIU nesta faixa.
                const queda = v !== null && v < 0 ? info.operadoresQueda : [];
                return (
                  <div className="bg-popover border border-border/80 w-72 rounded-lg p-3 shadow-md font-sans">
                    <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                      {info.faixa}
                    </p>
                    <p className="mt-1 flex items-baseline gap-2 text-sm">
                      <span className={`font-semibold ${abaixo ? "text-danger" : "text-success"}`}>
                        {info.txAcumDisplay !== null ? `${info.txAcumDisplay}%` : "—"}
                      </span>
                      {v !== null && v !== 0 && (
                        <span className={`text-xs ${v > 0 ? "text-success" : "text-danger"}`}>
                          {v > 0 ? "▲" : "▼"} {pct(Math.abs(v))}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {info.total} {info.total === 1 ? "pedido" : "pedidos"} na faixa
                      {info.tx !== null && <> · {pct(info.tx * 100)} retidos</>}
                    </p>

                    {queda.length > 0 && (
                      <>
                        <div className="bg-border/60 my-2 h-px" />
                        {/* Todos os operadores (sem "+ N"): nome · cancelamentos
                            nesta faixa. */}
                        <p className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
                          Puxaram a taxa para baixo
                        </p>
                        <ul className="space-y-0.5">
                          {queda.map((op) => (
                            <li key={op.login} className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="text-foreground truncate">{nomeOperador(op.login)}</span>
                              <span className="text-muted-foreground shrink-0">
                                cancelou {op.cancelados} de {op.total}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {info.totalAcum < MIN_PEDIDOS_AMOSTRA && (
                      <p className="text-muted-foreground mt-2 text-[11px] italic">
                        Amostra pequena: poucos pedidos até aqui.
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Volume da faixa — neutro, a cor da meta fica só na linha. */}
            <Bar
              yAxisId="right"
              dataKey="total"
              maxBarSize={18}
              radius={[4, 4, 0, 0]}
              fill="var(--muted-foreground)"
              opacity={0.14}
              isAnimationActive={false}
              animationDuration={300}
              animationEasing="ease-out"
            />

            <ReferenceLine
              yAxisId="left"
              y={meta}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: `Meta: ${meta.toFixed(0)}%`,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
                fontWeight: 600,
                offset: 5,
              }}
            />

            <Line
              yAxisId="left"
              type="linear"
              dataKey="txAcumDisplay"
              stroke="url(#txAcumLineGrad)"
              strokeWidth={3}
              isAnimationActive={false}
              animationDuration={350}
              animationEasing="ease-out"
              connectNulls
              dot={(props: { cx?: number; cy?: number; payload?: (typeof chartData)[0] }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || !payload || payload.txAcumDisplay === null) return null;
                const cor = payload.txAcumDisplay < meta ? "var(--danger)" : "var(--success)";
                const vazado = payload.totalAcum < MIN_PEDIDOS_AMOSTRA;
                return (
                  <circle
                    key={`dot-acum-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={vazado ? 4 : 4.5}
                    stroke={vazado ? cor : "var(--background)"}
                    strokeWidth={2}
                    fill={vazado ? "var(--background)" : cor}
                  />
                );
              }}
              activeDot={(props: { cx?: number; cy?: number; payload?: (typeof chartData)[0] }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || !payload || payload.txAcumDisplay === null) return null;
                const cor = payload.txAcumDisplay < meta ? "var(--danger)" : "var(--success)";
                return (
                  <circle
                    key={`active-dot-acum-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={6.5}
                    stroke="var(--background)"
                    strokeWidth={2}
                    fill={cor}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
