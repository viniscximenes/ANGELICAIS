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
import type { HoraEvolucaoData, TemaHoraData } from "@/lib/retencao/get-evolucao-hora";
import type { ReactNode } from "react";

interface GraficoEvolucaoProps {
  dados: HoraEvolucaoData[];
  meta: number; // Meta de 0 a 100
  /** Slot à direita do título (ex.: engrenagem de configuração de metas). */
  acoes?: ReactNode;
  /** Título acima do gráfico. Default = texto de sempre (comparativo). */
  titulo?: string;
  /** Subtítulo abaixo do título. Default = texto de sempre (comparativo). */
  descricao?: string;
  /**
   * Leitura aprimorada (só /s/reports/consolidado ativa; default false mantém o
   * gráfico de sempre em /operacao/comparativo-consolidado):
   * - barras de pedidos neutras (a cor verde/vermelha fica só na linha);
   * - legenda acima do gráfico (inclui o que é o eixo da direita);
   * - ponto vazado + aviso no tooltip em horas com amostra pequena;
   * - linha da meta mais visível, rótulo maior;
   * - distância da meta no tooltip ("2.6% abaixo da meta");
   * - eixo da taxa ajustado à faixa real dos dados (não 0–100% fixo).
   */
  visualDetalhado?: boolean;
}

/** Abaixo disso, a taxa da hora é marcada como amostra pequena. */
const MIN_PEDIDOS_AMOSTRA = 10;

/** Distância da meta em texto — "2.6% abaixo da meta" / "5.3% acima da meta". */
export function formatDistanciaMeta(tx: number, meta: number): string {
  const diff = tx - meta;
  if (Math.abs(diff) < 0.05) return "na meta";
  return `${Math.abs(diff).toFixed(1)}% ${diff < 0 ? "abaixo" : "acima"} da meta`;
}

/**
 * Cursor do tooltip (linha vertical) que some em horas sem pedidos. O
 * Recharts clona este elemento passando `points` (topo/base da linha),
 * `stroke` e `payload` da hora ativa.
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

// Rótulos das pontas do eixo ("< 08" / "≥ 20", vindos de get-evolucao-hora.ts)
// reescritos só pra EXIBIÇÃO — sem símbolos `<`/`≥`, mesma informação (hora
// bucket agrupa a hora cheia INTEIRA, ex.: "09" = 09:00 a 09:59). O dado em
// si (`label` original) não muda, só o texto mostrado no eixo/tooltip.
function formatEixoLabel(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return label;
}

/** Faixa completa da hora pro tooltip: "15:00" → "15:00 – 15:59". */
export function formatFaixaHora(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  const h = label.slice(0, 2);
  return `${h}:00 – ${h}:59`;
}

// Mesma ordenação do card "Retenção por Tema": maior tx primeiro.
function ordenarPorTema(temas: TemaHoraData[]): TemaHoraData[] {
  return [...temas].sort((a, b) => {
    if (a.tx === null && b.tx === null) return 0;
    if (a.tx === null) return 1;
    if (b.tx === null) return -1;
    return b.tx - a.tx;
  });
}

export function GraficoEvolucao({
  dados,
  meta,
  acoes,
  titulo = "Evolução de Taxa e Pedidos da Equipe",
  descricao = 'Taxa de retenção e volume de atendimentos por hora — cada hora do eixo agrupa o intervalo inteiro (ex.: "09" = 09:00 a 09:59).',
  visualDetalhado = false,
}: GraficoEvolucaoProps) {
  const chartData = dados.map((d) => ({
    ...d,
    txDisplay: d.tx !== null ? parseFloat((d.tx * 100).toFixed(1)) : null,
  }));

  // Calcula o offset exato do gradiente com base no máximo e mínimo dos dados apresentados
  const validTxValues = chartData.map((d) => d.txDisplay).filter((v): v is number => v !== null);
  const dataMax = validTxValues.length > 0 ? Math.max(...validTxValues) : 100;
  const dataMin = validTxValues.length > 0 ? Math.min(...validTxValues) : 0;

  let gradientOffset = 0;
  if (dataMax <= meta) {
    gradientOffset = 0;
  } else if (dataMin >= meta) {
    gradientOffset = 1;
  } else {
    gradientOffset = (dataMax - meta) / (dataMax - dataMin);
  }

  // ── Escala da taxa (só visualDetalhado) ──────────────────────────────
  // Com o eixo cheio (0–100%) a linha fica espremida numa faixa estreita.
  // Aqui o domínio se ajusta à faixa real (taxa e meta), com a faixa dos
  // dados na parte de cima do gráfico. Pedidos (eixo da direita) seguem com
  // a escala automática de sempre — barras na altura cheia.
  let eixoTaxa: { domain: [number, number]; ticks: number[] } = {
    domain: [0, 100],
    ticks: [0, 25, 50, 75, 100],
  };
  if (visualDetalhado) {
    const valoresTaxa = [...validTxValues, meta];
    const minTaxa = Math.min(...valoresTaxa);
    const maxTaxa = Math.max(...valoresTaxa);
    const faixa = Math.max(maxTaxa - minTaxa, 10);
    const passo = faixa > 40 ? 20 : 10;
    const topo = Math.min(100, Math.ceil((maxTaxa + faixa * 0.15) / passo) * passo);
    const base = Math.max(0, Math.floor((minTaxa - faixa * 1.3) / passo) * passo);
    // Marcas de % só na faixa das linhas (a parte de baixo é das barras, que
    // já têm as próprias marcas no eixo da direita).
    const ticksTaxa: number[] = [];
    const primeiraMarca = Math.max(base, Math.floor(minTaxa / passo) * passo);
    for (let v = primeiraMarca; v <= topo; v += passo) ticksTaxa.push(v);
    eixoTaxa = { domain: [base, topo], ticks: ticksTaxa };
  }

  return (
    <div className="space-y-3">
      {/* ── Título fora do card ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground">
            {titulo}
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            {descricao}
          </p>
        </div>
        {acoes && <div className="shrink-0">{acoes}</div>}
      </div>

      {visualDetalhado && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="9" y2="4" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="9" y1="4" x2="17" y2="4" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Taxa de retenção
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
            Pedidos (eixo da direita)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
            </svg>
            Amostra pequena (menos de {MIN_PEDIDOS_AMOSTRA} pedidos)
          </span>
        </div>
      )}

      {/* Container do gráfico removido a pedido (sem StyledCard/borda) —
          só o wrapper com a altura fixa que o ResponsiveContainer precisa. */}
      <div className={visualDetalhado ? "grafico-evolucao-chart w-full h-[320px]" : "w-full h-[280px]"}>
        {/* initialDimension: o Recharts mede o contêiner depois de montar; com o
            padrão (-1) avisava "width(-1) and height(-1)" no console quando o
            gráfico nasce num slide/diálogo ainda sem tamanho. */}
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="txLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--success)" />
                <stop offset={gradientOffset} stopColor="var(--danger)" />
                <stop offset={1} stopColor="var(--danger)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
            
            <XAxis
              dataKey="label"
              tickFormatter={formatEixoLabel}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            
            <YAxis
              yAxisId="left"
              domain={eixoTaxa.domain}
              ticks={eixoTaxa.ticks}
              tickFormatter={(v) => `${v}%`}
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

            {/* Custom Tooltip */}
            <Tooltip
              // visualDetalhado: hora sem pedidos não mostra tooltip nem a
              // linha vertical do cursor (não há nada pra ler ali).
              cursor={visualDetalhado ? <CursorSemHorasVazias /> : true}
              // Mesmo ancoramento do tooltip da visão acumulada: fixo no topo
              // do gráfico (não é cortado pelo trilho horizontal ao descer).
              position={visualDetalhado ? { y: 0 } : undefined}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const info = payload[0].payload as typeof chartData[0];
                if (visualDetalhado && info.total === 0) return null;
                const temasOrdenados = ordenarPorTema(info.porTema ?? []);

                // visualDetalhado: mesmo visual do tooltip da visão acumulada
                // (grafico-evolucao-acumulada.tsx) — faixa em cinza no topo,
                // um único número em destaque, resto em texto normal.
                if (visualDetalhado) {
                  const abaixo = info.txDisplay !== null && info.txDisplay < meta;
                  return (
                    <div className="bg-popover border border-border/80 w-72 rounded-lg p-3 shadow-md font-sans">
                      <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                        {formatFaixaHora(info.label)}
                      </p>
                      <p className="mt-1 flex items-baseline gap-2 text-sm">
                        <span className={`font-semibold ${abaixo ? "text-danger" : "text-success"}`}>
                          {info.txDisplay !== null ? `${info.txDisplay}%` : "—"}
                        </span>
                        {info.txDisplay !== null && (
                          <span className={`text-xs ${abaixo ? "text-danger" : "text-success"}`}>
                            {formatDistanciaMeta(info.txDisplay, meta)}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {info.total} {info.total === 1 ? "pedido" : "pedidos"} · {info.retidos}{" "}
                        {info.retidos === 1 ? "retido" : "retidos"} · {info.cancelados}{" "}
                        {info.cancelados === 1 ? "cancelado" : "cancelados"}
                      </p>

                      {temasOrdenados.length > 0 && (
                        <>
                          <div className="bg-border/60 my-2 h-px" />
                          <p className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
                            Retenção por tema
                          </p>
                          <ul className="space-y-0.5">
                            {temasOrdenados.map((tema) => {
                              const txTema = tema.tx !== null ? tema.tx * 100 : null;
                              return (
                                <li key={tema.motivo} className="flex items-baseline justify-between gap-3 text-xs">
                                  <span className="text-foreground truncate">{tema.motivo}</span>
                                  <span
                                    className={`shrink-0 ${
                                      txTema === null
                                        ? "text-muted-foreground"
                                        : txTema < meta
                                          ? "text-danger"
                                          : "text-success"
                                    }`}
                                  >
                                    {txTema !== null ? `${txTema.toFixed(1)}%` : "—"}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}

                      {info.total < MIN_PEDIDOS_AMOSTRA && (
                        <p className="text-muted-foreground mt-2 text-[11px] italic">
                          Amostra pequena: poucos pedidos nesta hora.
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="bg-popover border border-border/80 rounded-lg p-3 shadow-md space-y-1.5 font-sans">
                    <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Hora: {formatEixoLabel(info.label)}
                    </p>
                    <div className="h-px bg-border/60 my-1" />
                    <p className="text-xs text-muted-foreground">
                      Retenção:{" "}
                      <strong className={info.txDisplay !== null && info.txDisplay < meta ? "text-danger" : "text-success"}>
                        {info.txDisplay !== null ? `${info.txDisplay}%` : "—"}
                      </strong>
                      {visualDetalhado && info.txDisplay !== null && (
                        <span className={info.txDisplay < meta ? "text-danger" : "text-success"}>
                          {" "}({formatDistanciaMeta(info.txDisplay, meta)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedidos: <strong className="text-foreground">{info.total}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Retidos: <strong className="text-foreground">{info.retidos}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cancelados: <strong className="text-foreground">{info.cancelados}</strong>
                    </p>
                    {visualDetalhado && info.txDisplay !== null && info.total < MIN_PEDIDOS_AMOSTRA && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Amostra pequena: poucos pedidos nesta hora.
                      </p>
                    )}

                    {temasOrdenados.length > 0 && (
                      <>
                        <div className="h-px bg-border/60 my-1" />
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                          Retenção por Tema
                        </p>
                        {temasOrdenados.map((tema) => (
                          <p key={tema.motivo} className="text-xs text-muted-foreground">
                            {tema.motivo}:{" "}
                            <strong className={tema.tx !== null && tema.tx * 100 < meta ? "text-danger" : "text-success"}>
                              {tema.tx !== null ? `${(tema.tx * 100).toFixed(1)}%` : "—"}
                            </strong>
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                );
              }}
            />

            {/* Fundo do Volume (Barras) */}
            <Bar
              yAxisId="right"
              dataKey="total"
              barSize={30}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!visualDetalhado}
              animationDuration={300}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => {
                const isBelow = entry.txDisplay !== null && entry.txDisplay < meta;
                // visualDetalhado: barra = volume, cor neutra (o verde/vermelho
                // da meta fica só na linha da taxa).
                const cellColor = visualDetalhado
                  ? "var(--muted-foreground)"
                  : isBelow
                    ? "var(--danger)"
                    : "var(--success)";
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={cellColor}
                    opacity={visualDetalhado ? 0.14 : 0.15}
                  />
                );
              })}
            </Bar>

            {/* Referência da Meta */}
            <ReferenceLine
              yAxisId="left"
              y={meta}
              stroke={visualDetalhado ? "var(--muted-foreground)" : "var(--border)"}
              strokeWidth={visualDetalhado ? 1.5 : 1}
              strokeDasharray="4 4"
              strokeOpacity={visualDetalhado ? 0.7 : 0.8}
              label={{
                value: `Meta: ${meta.toFixed(0)}%`,
                // Topo-esquerda no detalhado: a ponta direita colide com o
                // último ponto da linha quando ele fica perto da meta.
                position: visualDetalhado ? "insideTopLeft" : "insideBottomLeft",
                fill: "var(--muted-foreground)",
                fontSize: visualDetalhado ? 11 : 10,
                fontWeight: 600,
                offset: 5,
              }}
            />

            {/* Linha da Retenção */}
            <Line
              yAxisId="left"
              // Reta no visualDetalhado: dado por hora (sem valor entre uma
              // hora e outra) — a curva sugeria variação contínua.
              type={visualDetalhado ? "linear" : "monotone"}
              dataKey="txDisplay"
              stroke="url(#txLineGrad)"
              strokeWidth={3}
              isAnimationActive={!visualDetalhado}
              animationDuration={350}
              animationEasing="ease-out"
              dot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string; total: number } }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                const isBelow = payload.txDisplay < meta;
                const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                // Amostra pequena: ponto vazado (só contorno na cor da taxa).
                if (visualDetalhado && payload.total < MIN_PEDIDOS_AMOSTRA) {
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
              activeDot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                const isBelow = payload.txDisplay < meta;
                const dotColor = isBelow ? "var(--danger)" : "var(--success)";
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
    </div>
  );
}
