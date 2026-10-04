"use client";

import { useMemo } from "react";
import {
  Bar,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HoraPolo, SupervisorLinha } from "@/lib/coordenador/types";

import { classeTx, formatImpacto, formatTx } from "./format";
import { MatrizTaxaSupervisor, MIN_PEDIDOS_MATRIZ } from "./matriz-taxa-supervisor";

function formatEixo(label: string) {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return label.slice(0, 2) + "h";
}

function formatFaixa(label: string) {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  const h = label.slice(0, 2);
  return `${h}:00 – ${h}:59`;
}

/** Recorta as horas vazias das pontas (antes do 1º e depois do último atendimento). */
function recortarHoras(evolucao: HoraPolo[]): HoraPolo[] {
  const primeiro = evolucao.findIndex((h) => h.pedidos > 0);
  if (primeiro === -1) return [];
  let ultimo = evolucao.length - 1;
  while (ultimo > primeiro && evolucao[ultimo].pedidos === 0) ultimo--;
  return evolucao.slice(primeiro, ultimo + 1);
}

/** Cores das séries (tokens do tema, mesma convenção dos cards: pedidos neutro, retidos verde, cancelados vermelho). */
const COR_PEDIDOS = "color-mix(in oklab, var(--foreground) 78%, transparent)";
const COR_RETIDOS = "var(--success)";
const COR_CANCELADOS = "var(--danger)";

/** Categoria extra no fim do eixo, no formato da planilha do coordenador. */
const LABEL_TOTAL = "Total";

function Legenda({ meta }: { meta: number }) {
  const quadrado = (cor: string, texto: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
      {texto}
    </span>
  );
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      {quadrado(COR_PEDIDOS, "Pedidos")}
      {quadrado(COR_RETIDOS, "Retidos")}
      {quadrado(COR_CANCELADOS, "Cancelados")}
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line x1="1" y1="4" x2="9" y2="4" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="9" y1="4" x2="17" y2="4" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        % Retenção
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        Meta {meta}%
      </span>
    </div>
  );
}

/** Etiqueta da taxa em caixa (estilo da planilha): borda na cor do veredito, texto na tinta do tema. */
function EtiquetaTaxa({ x, y, valor, meta }: { x: number; y: number; valor: number; meta: number }) {
  const texto = `${valor.toFixed(1).replace(".", ",")}%`;
  const largura = texto.length * 6.6 + 12;
  const cor = valor < meta ? "var(--danger)" : "var(--success)";
  return (
    <g pointerEvents="none">
      <rect
        x={x - largura / 2}
        y={y - 30}
        width={largura}
        height={19}
        rx={4}
        fill="var(--background)"
        stroke={cor}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y - 16.5}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--foreground)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {texto}
      </text>
    </g>
  );
}

type PontoGrafico = HoraPolo & { total: boolean; txHora: number | null; txTotal: number | null };

type PropsPonto = { cx?: number; cy?: number; payload?: PontoGrafico; index?: number };

export function EvolucaoPolo({
  evolucao,
  supervisores,
  meta,
}: {
  evolucao: HoraPolo[];
  supervisores: SupervisorLinha[];
  meta: number;
}) {
  const horas = useMemo(() => recortarHoras(evolucao), [evolucao]);
  const nomePorId = useMemo(
    () => new Map(supervisores.map((s) => [s.gestorId, s.nome])),
    [supervisores],
  );

  if (horas.length === 0) {
    return (
      <div
        className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
        style={{ border: "1px solid var(--border)" }}
      >
        Sem atendimentos com horário na base do dia.
      </div>
    );
  }

  // Formato da planilha do coordenador: barras Pedidos/Retidos/Cancelados por
  // hora + coluna "Total geral" no fim, e a linha da taxa com etiqueta em cada
  // hora. O ponto do Total fica numa série própria (txTotal), sem ligar com a
  // última hora — senão a linha sugeriria uma evolução que não existe.
  const totalRetidos = horas.reduce((acc, h) => acc + h.retidos, 0);
  const totalCancelados = horas.reduce((acc, h) => acc + h.cancelados, 0);
  const totalPedidos = totalRetidos + totalCancelados;
  const txTotal = totalPedidos > 0 ? +((totalRetidos / totalPedidos) * 100).toFixed(1) : null;

  const chartData: PontoGrafico[] = [
    ...horas.map((h) => ({
      ...h,
      total: false,
      txHora: h.txRetencao !== null ? +(h.txRetencao * 100).toFixed(1) : null,
      txTotal: null,
    })),
    {
      hora: -1,
      label: LABEL_TOTAL,
      pedidos: totalPedidos,
      retidos: totalRetidos,
      cancelados: totalCancelados,
      txRetencao: totalPedidos > 0 ? totalRetidos / totalPedidos : null,
      txAcumulada: null,
      supervisores: [],
      total: true,
      txHora: null,
      txTotal,
    },
  ];

  const valores = [...chartData.map((d) => d.txHora), txTotal].filter(
    (v): v is number => v !== null,
  );

  // Gradiente da linha: verde acima da meta, vermelho abaixo, troca na altura da meta.
  const dataMax = valores.length > 0 ? Math.max(...valores) : 100;
  const dataMin = valores.length > 0 ? Math.min(...valores) : 0;
  const gradientOffset =
    dataMax <= meta ? 0 : dataMin >= meta ? 1 : (dataMax - meta) / (dataMax - dataMin);

  // Duas faixas sem sobreposição (como na planilha): a linha da taxa ocupa a
  // metade de cima e as barras a metade de baixo. Eixos Y ocultos — todo valor
  // já vem escrito no gráfico (etiquetas da taxa e números das barras).
  const minTx = Math.min(meta, ...valores);
  const maxTx = Math.max(meta, ...valores);
  const faixaTx = Math.max(maxTx - minTx, 5);
  const dominioTx: [number, number] = [minTx - faixaTx * 1.3, maxTx + faixaTx * 0.25];
  const maxQtd = Math.max(...chartData.map((d) => d.pedidos), 1);
  const dominioQtd: [number, number] = [0, maxQtd * 2.1];

  const rotuloBarra = {
    position: "top" as const,
    fill: "var(--muted-foreground)",
    fontSize: 10,
    offset: 4,
  };

  const pontoTaxa = (chave: "txHora" | "txTotal") =>
    function Ponto(props: PropsPonto) {
      const { cx, cy, payload, index } = props;
      const valor = payload?.[chave] ?? null;
      if (cx === undefined || cy === undefined || !payload || valor === null) {
        return <g key={`${chave}-${index}`} />;
      }
      return (
        <g key={`${chave}-${index}`}>
          <circle
            cx={cx}
            cy={cy}
            r={4}
            fill={valor < meta ? "var(--danger)" : "var(--success)"}
            stroke="var(--background)"
            strokeWidth={2}
          />
          <EtiquetaTaxa x={cx} y={cy} valor={valor} meta={meta} />
        </g>
      );
    };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Legenda meta={meta} />
        {/* grafico-evolucao-chart: reaproveita a regra de reports-consolidado.css
            que tira o contorno branco de foco do navegador ao clicar no gráfico. */}
        <div
          className="grafico-evolucao-chart h-[380px] w-full [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              // Sem a camada de acessibilidade por teclado do Recharts: é ela
              // que torna a área do gráfico focável e desenha o contorno
              // branco ao clicar.
              accessibilityLayer={false}
              data={chartData}
              margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
              barGap={2}
              barCategoryGap="22%"
            >
              <defs>
                <linearGradient id="coord-tx-line-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="var(--success)" />
                  <stop offset={gradientOffset} stopColor="var(--success)" />
                  <stop offset={gradientOffset} stopColor="var(--danger)" />
                  <stop offset={1} stopColor="var(--danger)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickFormatter={(l: string) => (l === LABEL_TOTAL ? "Total geral" : formatEixo(l))}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
              />
              <YAxis yAxisId="tx" domain={dominioTx} hide />
              <YAxis yAxisId="qtd" domain={dominioQtd} hide />

              <Bar yAxisId="qtd" dataKey="pedidos" name="Pedidos" fill={COR_PEDIDOS} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="pedidos" {...rotuloBarra} />
              </Bar>
              <Bar yAxisId="qtd" dataKey="retidos" name="Retidos" fill={COR_RETIDOS} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="retidos" {...rotuloBarra} />
              </Bar>
              <Bar yAxisId="qtd" dataKey="cancelados" name="Cancelados" fill={COR_CANCELADOS} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="cancelados" {...rotuloBarra} />
              </Bar>

              <ReferenceLine
                yAxisId="tx"
                y={meta}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
              <Line
                yAxisId="tx"
                type="linear"
                dataKey="txHora"
                name="% Retenção"
                stroke="url(#coord-tx-line-grad)"
                strokeWidth={2.5}
                connectNulls={false}
                isAnimationActive={false}
                dot={pontoTaxa("txHora")}
                activeDot={false}
              />
              {/* Ponto do Total: série própria, sem linha ligando à última hora. */}
              <Line
                yAxisId="tx"
                dataKey="txTotal"
                name="% Retenção (total)"
                stroke="none"
                isAnimationActive={false}
                dot={pontoTaxa("txTotal")}
                activeDot={false}
              />
              {/* Sem a animação de posição do Recharts: aparece direto, como os demais tooltips. */}
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const info = payload[0].payload as PontoGrafico;
                  if (info.pedidos === 0) return null;
                  const detratores = info.supervisores
                    .filter((s) => (s.impacto ?? 0) > 0.0005)
                    .slice(0, 3);
                  return (
                    <div className="bg-popover border-border/80 w-72 rounded-lg border p-3 font-sans shadow-md">
                      <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                        {info.total ? "Total geral do dia" : formatFaixa(info.label)}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className={`font-semibold ${classeTx(info.txRetencao, meta)}`}>
                          {formatTx(info.txRetencao)}
                        </span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {/* mx-2 no separador ≈ um espaço a mais de cada lado do "·". */}
                        {info.pedidos} pedidos<span className="mx-2">·</span>
                        {info.retidos} retidos<span className="mx-2">·</span>
                        {info.cancelados} cancelados
                      </p>
                      {detratores.length > 0 && (
                        <>
                          <div className="bg-border/60 my-2 h-px" />
                          <p className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
                            Quem derrubou nesta hora
                          </p>
                          <ul className="space-y-0.5">
                            {detratores.map((s) => (
                              <li key={s.gestorId} className="flex items-baseline justify-between gap-3 text-xs">
                                <span className="text-foreground truncate">
                                  {nomePorId.get(s.gestorId) ?? "Sem supervisor"}
                                </span>
                                <span className="text-danger shrink-0">{formatImpacto(s.impacto).texto}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

/** Taxa de cada supervisor em cada hora — slide/bloco "Taxa por hora - Supervisor". */
export function TabelaTaxaPorHora({
  evolucao,
  supervisores,
  meta,
}: {
  evolucao: HoraPolo[];
  supervisores: SupervisorLinha[];
  meta: number;
}) {
  const horas = useMemo(() => recortarHoras(evolucao), [evolucao]);
  return (
    <MatrizTaxaSupervisor
      titulo="Taxa por hora - Supervisor"
      descricao={`Taxa de retenção de cada equipe, hora a hora. Passe o mouse sobre uma taxa para ver pedidos, retidos e cancelados. Células esmaecidas têm menos de ${MIN_PEDIDOS_MATRIZ} pedidos.`}
      supervisores={supervisores}
      colunas={horas.map((h) => ({
        chave: String(h.hora),
        rotulo: formatEixo(h.label),
        rotuloTooltip: formatFaixa(h.label),
      }))}
      celula={(s, chave) => {
        const hora = horas.find((h) => String(h.hora) === chave);
        return hora?.supervisores.find((x) => x.gestorId === s.gestorId) ?? null;
      }}
      meta={meta}
    />
  );
}
