"use client";

import { useMemo, useState } from "react";
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

import type { HoraPolo, SupervisorLinha } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import {
  TABELA_LINHA_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";

import { abaixoDaMeta, classeTx, formatImpacto, formatTx } from "./format";
import { Cabecalho, CelulaTx } from "./tabela-supervisores";

const GRID_HORA = { gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1.2fr 1.1fr" };

/** Abaixo disso a taxa da hora de um supervisor é "amostra pequena" (esmaecida). */
const MIN_PEDIDOS_CELULA = 3;

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

function Legenda({ meta }: { meta: number }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="9"
            y2="4"
            stroke="var(--success)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="4"
            x2="17"
            y2="4"
            stroke="var(--danger)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        Taxa de retenção
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="17"
            y2="4"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
        Meta {meta}%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-[2px]"
          style={{
            background:
              "color-mix(in oklab, var(--muted-foreground) 14%, transparent)",
          }}
        />
        Volume de pedidos (eixo da direita)
      </span>
    </div>
  );
}

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
  const [horaSelecionada, setHoraSelecionada] = useState<number | null>(null);

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

  const chartData = horas.map((h) => ({
    ...h,
    txHora: h.txRetencao !== null ? +(h.txRetencao * 100).toFixed(1) : null,
  }));

  const valores = chartData
    .map((d) => d.txHora)
    .filter((v): v is number => v !== null);

  // Gradiente da linha — mesma técnica do GraficoEvolucao (Consolidado do
  // gestor): verde acima da meta, vermelho abaixo, com a troca exatamente na
  // altura da meta (offset relativo à faixa de valores da própria linha).
  const dataMax = valores.length > 0 ? Math.max(...valores) : 100;
  const dataMin = valores.length > 0 ? Math.min(...valores) : 0;
  const gradientOffset =
    dataMax <= meta
      ? 0
      : dataMin >= meta
        ? 1
        : (dataMax - meta) / (dataMax - dataMin);
  const minTx = Math.min(meta, ...valores);
  const maxTx = Math.max(meta, ...valores);
  const base = Math.max(0, Math.floor((minTx - 10) / 10) * 10);
  const topo = Math.min(100, Math.ceil((maxTx + 5) / 10) * 10);

  const horaDetalhe = horas.find((h) => h.hora === horaSelecionada) ?? null;

  /** Hora (com pedidos) sob o cursor num evento do gráfico. */
  const horaDoEvento = (e: unknown) => {
    const idx = (e as { activeTooltipIndex?: number | string } | null)
      ?.activeTooltipIndex;
    const h =
      idx !== undefined && idx !== null ? chartData[Number(idx)] : undefined;
    return h && h.pedidos > 0 ? h : null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Legenda meta={meta} />
        {/* grafico-evolucao-chart: reaproveita a regra de reports-consolidado.css
            que tira o contorno branco de foco do navegador ao clicar no gráfico. */}
        <div
          className="grafico-evolucao-chart h-[320px] w-full [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
          // Tabela da hora só vive enquanto o mouse está no gráfico.
          onMouseLeave={() => setHoraSelecionada(null)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              // Sem a camada de acessibilidade por teclado do Recharts: é ela
              // que torna a área do gráfico focável e desenha o contorno
              // branco ao clicar.
              accessibilityLayer={false}
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              // Clique abre a tabela da hora; com ela aberta, a hora acompanha
              // o mouse (sem precisar clicar de novo). Fecha ao sair do gráfico.
              onClick={(e) => {
                const h = horaDoEvento(e);
                if (h) setHoraSelecionada(h.hora);
              }}
              onMouseMove={(e) => {
                if (horaSelecionada === null) return;
                const h = horaDoEvento(e);
                if (h && h.hora !== horaSelecionada) setHoraSelecionada(h.hora);
              }}
            >
              <defs>
                <linearGradient
                  id="coord-tx-line-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                tickFormatter={formatEixo}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="tx"
                domain={[base, topo]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="qtd"
                orientation="right"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  opacity: 0.6,
                }}
              />
              <Bar
                yAxisId="qtd"
                dataKey="pedidos"
                fill="var(--muted-foreground)"
                fillOpacity={0.14}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                cursor="pointer"
                isAnimationActive={false}
              />
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
                stroke="url(#coord-tx-line-grad)"
                strokeWidth={3}
                connectNulls
                isAnimationActive={false}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: (typeof chartData)[number];
                  index?: number;
                }) => {
                  const { cx, cy, payload, index } = props;
                  if (
                    cx === undefined ||
                    cy === undefined ||
                    !payload ||
                    payload.txHora === null
                  ) {
                    return <g key={`d-${index}`} />;
                  }
                  const ruim = payload.txHora < meta;
                  return (
                    <circle
                      key={`d-${index}`}
                      cx={cx}
                      cy={cy}
                      r={payload.hora === horaSelecionada ? 7 : 5}
                      fill={ruim ? "var(--danger)" : "var(--success)"}
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  );
                }}
                // Bolinha de hover pintada pela taxa da HORA (sem isto o
                // Recharts herdava o gradiente da linha e a cor não batia).
                activeDot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: (typeof chartData)[number];
                  index?: number;
                }) => {
                  const { cx, cy, payload, index } = props;
                  if (
                    cx === undefined ||
                    cy === undefined ||
                    !payload ||
                    payload.txHora === null
                  ) {
                    return <g key={`a-${index}`} />;
                  }
                  return (
                    <circle
                      key={`a-${index}`}
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill={
                        payload.txHora < meta
                          ? "var(--danger)"
                          : "var(--success)"
                      }
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  );
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const info = payload[0].payload as (typeof chartData)[number];
                  if (info.pedidos === 0) return null;
                  const detratores = info.supervisores
                    .filter((s) => (s.impacto ?? 0) > 0.0005)
                    .slice(0, 3);
                  return (
                    <div className="bg-popover border-border/80 w-72 rounded-lg border p-3 font-sans shadow-md">
                      <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                        {formatFaixa(info.label)}
                      </p>
                      <p className="mt-1 text-sm">
                        <span
                          className={`font-semibold ${classeTx(info.txRetencao, meta)}`}
                        >
                          {formatTx(info.txRetencao)}
                        </span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {info.pedidos} pedidos · {info.retidos} retidos ·{" "}
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
                              <li
                                key={s.gestorId}
                                className="flex items-baseline justify-between gap-3 text-xs"
                              >
                                <span className="text-foreground truncate">
                                  {nomePorId.get(s.gestorId) ??
                                    "Sem supervisor"}
                                </span>
                                <span className="text-danger shrink-0">
                                  {formatImpacto(s.impacto).texto}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {horaSelecionada === null && (
                        <p className="text-muted-foreground mt-2 text-[11px]">
                          Clique para abrir a tabela de hora em hora.
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {horaDetalhe && (
        <div className="space-y-2">
          <p className="ds-small text-muted-foreground tracking-wider uppercase">
            Supervisores em {formatFaixa(horaDetalhe.label)} · polo{" "}
            <span className={classeTx(horaDetalhe.txRetencao, meta)}>
              {formatTx(horaDetalhe.txRetencao)}
            </span>
          </p>
          <div>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <Cabecalho
                  grid={GRID_HORA}
                  colunas={[
                    "Supervisor",
                    "Pedidos",
                    "Retidos",
                    "Cancelados",
                    "Impacto no polo",
                    "Tx Retenção",
                  ]}
                />
                {horaDetalhe.supervisores.map((s) => {
                  const pedidos = s.retidos + s.cancelados;
                  const tx = pedidos > 0 ? s.retidos / pedidos : null;
                  const impacto = formatImpacto(s.impacto);
                  return (
                    <div
                      key={s.gestorId}
                      className={`${TABELA_LINHA_CLASS} border-t border-border/40`}
                      style={GRID_HORA}
                    >
                      <div className="ds-body text-foreground min-w-0 truncate border-r border-border/30 px-3 py-2 font-medium">
                        {nomePorId.get(s.gestorId) ?? "Sem supervisor"}
                      </div>
                      <div className={TABELA_VALOR_CELL_CLASS}>{pedidos}</div>
                      <div className={TABELA_VALOR_CELL_CLASS}>{s.retidos}</div>
                      <div className={TABELA_VALOR_CELL_CLASS}>
                        {s.cancelados}
                      </div>
                      <div className={TABELA_VALOR_CELL_CLASS}>
                        <span className={impacto.classe}>{impacto.texto}</span>
                      </div>
                      <CelulaTx tx={tx} meta={meta} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tabela de taxa por hora (supervisor × hora) — separada do gráfico para
 * virar um slide próprio do trilho horizontal da página.
 */
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
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 text-foreground font-semibold">
          Tabela de taxa por hora
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Cada célula é a taxa da equipe naquela hora (pedidos embaixo). Apagada
          = menos de {MIN_PEDIDOS_CELULA} pedidos.
        </p>
      </div>
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: coluna do supervisor com largura fixa e
                todas as horas com a MESMA largura — células do mesmo tamanho. */}
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "10.5rem" }} />
            {horas.map((h) => (
              <col key={h.hora} />
            ))}
          </colgroup>
          <thead>
            {/* Mesmo visual do cabeçalho da EquipeTable (/reports/consolidado). */}
            <tr className="ds-body bg-muted/40 text-foreground font-bold tracking-wide uppercase">
              <th className="px-2 py-2.5 text-center align-middle whitespace-nowrap">
                Supervisor
              </th>
              {horas.map((h) => (
                <th
                  key={h.hora}
                  className="px-1 py-2.5 text-center align-middle whitespace-nowrap"
                >
                  {formatEixo(h.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {supervisores.map((s) => (
              <tr key={s.gestorId}>
                <td className="ds-body text-foreground truncate px-3 py-1.5 text-center font-medium">
                  {s.nome}
                </td>
                {horas.map((h) => {
                  const cel = h.supervisores.find(
                    (x) => x.gestorId === s.gestorId,
                  );
                  const pedidos = cel ? cel.retidos + cel.cancelados : 0;
                  if (!cel || pedidos === 0) {
                    return (
                      <td
                        key={h.hora}
                        className="text-muted-foreground/50 p-1 text-center"
                      >
                        ·
                      </td>
                    );
                  }
                  const tx = cel.retidos / pedidos;
                  const ruim = abaixoDaMeta(tx, meta);
                  const pequena = pedidos < MIN_PEDIDOS_CELULA;
                  return (
                    <td key={h.hora} className="p-1 text-center">
                      <div
                        className="rounded px-1 py-1"
                        style={{
                          background: `color-mix(in oklab, ${ruim ? "var(--danger)" : "var(--success)"} ${pequena ? 8 : 18}%, transparent)`,
                          opacity: pequena ? 0.6 : 1,
                        }}
                        title={`${s.nome} · ${formatFaixa(h.label)}: ${cel.retidos} retidos, ${cel.cancelados} cancelados`}
                      >
                        <div
                          className={cn(
                            "font-semibold",
                            ruim ? "text-danger" : "text-success",
                          )}
                        >
                          {Math.round(tx * 100)}%
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {pedidos}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
