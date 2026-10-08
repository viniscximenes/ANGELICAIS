"use client";

import { useId, useMemo } from "react";
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

import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import { GraficoVazio } from "./analitico-skeleton";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";

/**
 * "Evolução da equipe" de /s/reports/consolidado — MESMO visual e regras do
 * "Evolução do polo" do /c (coordenador/evolucao-polo.tsx): barras
 * Pedidos/Retidos/Cancelados por hora + coluna "Total geral", linha da taxa
 * com etiqueta em cada hora (verde/vermelho pela meta), meta tracejada e
 * horas vazias das pontas recortadas. Adaptado pra equipe: no tooltip, em
 * vez dos supervisores, os OPERADORES que mais derrubaram a taxa na hora —
 * sempre pelo nome real (sem nome fantasia), a pedido.
 */

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

function formatTx(tx: number | null): string {
  return tx === null ? "—" : `${(tx * 100).toFixed(1)}%`;
}

/** Vermelho abaixo da meta (meta em %), verde na meta ou acima. */
function classeTx(tx: number | null, meta: number): string {
  if (tx === null) return "text-muted-foreground";
  return tx < meta / 100 ? "text-danger" : "text-success";
}

/** Impacto do ponto de vista da equipe: derrubou → "−2.4%". */
function formatImpacto(impacto: number | null): string {
  if (impacto === null) return "—";
  return `−${Math.abs(impacto * 100).toFixed(1)}%`;
}

/** Recorta as horas vazias das pontas (antes do 1º e depois do último atendimento). */
function recortarHoras(evolucao: HoraEvolucaoData[]): HoraEvolucaoData[] {
  const primeiro = evolucao.findIndex((h) => h.total > 0);
  if (primeiro === -1) return [];
  let ultimo = evolucao.length - 1;
  while (ultimo > primeiro && evolucao[ultimo].total === 0) ultimo--;
  return evolucao.slice(primeiro, ultimo + 1);
}

const COR_PEDIDOS = "color-mix(in oklab, var(--foreground) 78%, transparent)";
const COR_RETIDOS = "var(--success)";
const COR_CANCELADOS = "var(--danger)";

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

/** Etiqueta da taxa em caixa: borda na cor do veredito, texto na tinta do tema. */
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

type PontoGrafico = {
  label: string;
  pedidos: number;
  retidos: number;
  cancelados: number;
  txRetencao: number | null;
  operadores: NonNullable<HoraEvolucaoData["operadores"]>;
  total: boolean;
  txHora: number | null;
  txTotal: number | null;
};

type PropsPonto = { cx?: number; cy?: number; payload?: PontoGrafico; index?: number };

export function EvolucaoEquipe({
  evolucao,
  meta,
  titulo,
  descricao,
  altura = 380,
}: {
  evolucao: HoraEvolucaoData[];
  /** Meta da taxa em % (ex.: 65). */
  meta: number;
  /** Sem título/descrição (ex.: dialog do operador, que tem o próprio). */
  titulo?: string;
  descricao?: string;
  /** Altura do gráfico em px (380 no Analítico; menor no dialog). */
  altura?: number;
}) {
  const horas = useMemo(() => recortarHoras(evolucao), [evolucao]);
  // Id único do gradiente: Analítico e dialog do operador podem estar na
  // tela ao mesmo tempo — com o mesmo id, um usaria o gradiente do outro.
  const gradId = `evol-tx-grad-${useId().replace(/:/g, "")}`;

  const cabecalho = titulo ? (
    <div>
      <h3 className="ds-h3 font-semibold text-foreground">{titulo}</h3>
      {descricao && <p className="ds-small text-muted-foreground mt-1">{descricao}</p>}
    </div>
  ) : null;

  if (horas.length === 0) {
    return (
      <div className="space-y-3">
        {cabecalho}
        {/* Mesmo estado vazio do Analítico: gráfico esqueleto parado, sem
            container, com a mensagem no centro. */}
        <GraficoVazio
          titulo="Sem atendimentos por hora"
          descricao="Nenhum atendimento com horário registrado na base do dia."
          altura={Math.min(altura, 320)}
        />
      </div>
    );
  }

  const totalRetidos = horas.reduce((acc, h) => acc + h.retidos, 0);
  const totalCancelados = horas.reduce((acc, h) => acc + h.cancelados, 0);
  const totalPedidos = totalRetidos + totalCancelados;
  const txTotal = totalPedidos > 0 ? +((totalRetidos / totalPedidos) * 100).toFixed(1) : null;

  const chartData: PontoGrafico[] = [
    ...horas.map((h) => ({
      label: h.label,
      pedidos: h.total,
      retidos: h.retidos,
      cancelados: h.cancelados,
      txRetencao: h.tx,
      operadores: h.operadores ?? [],
      total: false,
      txHora: h.tx !== null ? +(h.tx * 100).toFixed(1) : null,
      txTotal: null,
    })),
    {
      label: LABEL_TOTAL,
      pedidos: totalPedidos,
      retidos: totalRetidos,
      cancelados: totalCancelados,
      txRetencao: totalPedidos > 0 ? totalRetidos / totalPedidos : null,
      operadores: [],
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

  // Cores do gradiente já resolvidas (não "var(--…)"): o "baixar PNG" do
  // dialog do operador serializa o SVG num <img> isolado, onde var() não
  // resolve — o gradiente sumiria da imagem. Mesma técnica do gráfico antigo
  // do dialog.
  const escopo =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>('[data-page="reports-consolidado"]')
      : null;
  const corSucesso = resolverTokenCss("--success", "#16a34a", escopo);
  const corPerigo = resolverTokenCss("--danger", "#dc2626", escopo);

  // Linha da taxa RETA (todas as horas com o mesmo valor — ex.: operador com
  // 100% ou 0% o dia todo): a caixa do path tem altura zero e o SVG não
  // desenha um gradiente em objectBoundingBox nela — a linha entre as horas
  // sumia. Nesse caso usa a cor sólida que o gradiente daria (verde na meta
  // ou acima, vermelho abaixo); com variação, segue o gradiente.
  const txHoras = chartData.map((d) => d.txHora).filter((v): v is number => v !== null);
  const linhaReta = txHoras.length > 0 && txHoras.every((v) => v === txHoras[0]);
  const strokeTaxa = linhaReta
    ? txHoras[0] < meta
      ? corPerigo
      : corSucesso
    : `url(#${gradId})`;

  // Duas faixas sem sobreposição: a linha da taxa ocupa a metade de cima e as
  // barras a metade de baixo. Eixos Y ocultos — todo valor já vem escrito.
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
    <div className="space-y-3">
      {cabecalho}
      <Legenda meta={meta} />
      {/* grafico-evolucao-chart: regra de reports-consolidado.css que tira o
          contorno de foco do navegador ao clicar no gráfico. */}
      <div
        className="grafico-evolucao-chart w-full [&_*:focus:not(:focus-visible)]:outline-none"
        style={{ height: altura }}
      >
        {/* initialDimension: o Recharts mede o contêiner depois de montar; com o
            padrão (-1) avisava "width(-1) and height(-1)" no console quando o
            gráfico nasce num slide/diálogo ainda sem tamanho. */}
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <ComposedChart
            // Teclado: Tab foca o gráfico e ←/→ percorrem as horas mostrando
            // o mesmo tooltip do ponteiro (antes desligado — só o mouse via
            // "Quem derrubou nesta hora"). Anel de foco só no teclado
            // (reports-consolidado.css, .grafico-evolucao-chart).
            accessibilityLayer
            title={titulo ?? "Evolução por hora"}
            desc="Use as setas esquerda e direita para ver os detalhes de cada hora."
            data={chartData}
            margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor={corSucesso} />
                <stop offset={gradientOffset} stopColor={corSucesso} />
                <stop offset={gradientOffset} stopColor={corPerigo} />
                <stop offset={1} stopColor={corPerigo} />
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
              stroke={strokeTaxa}
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
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const info = payload[0].payload as PontoGrafico;
                if (info.pedidos === 0) return null;
                const detratores = info.operadores
                  .filter((o) => (o.impacto ?? 0) > 0.0005)
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
                          {detratores.map((o) => (
                            <li key={o.login} className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="text-foreground truncate">{deriveNomeOperador(o.login)}</span>
                              <span className="text-danger shrink-0">{formatImpacto(o.impacto)}</span>
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
        {/*
          Alternativa ao gráfico para leitor de tela/teclado (auditoria
          2026-10-07): o detalhe por hora e "quem derrubou" só existia no
          tooltip do ponteiro. Complementa o teclado do gráfico
          (accessibilityLayer, ←/→): leitor de tela lê a tabela inteira de
          uma vez. É sr-only — não muda nada no visual. Fica DENTRO do
          contêiner do gráfico: como irmã no space-y-3, o gráfico deixaria de
          ser o último filho e ganharia margem embaixo.
        */}
        <table className="sr-only">
          <caption>{titulo ?? "Evolução por hora"}: taxa de retenção, pedidos e quem derrubou a taxa em cada faixa</caption>
          <thead>
            <tr>
              <th scope="col">Faixa</th>
              <th scope="col">Taxa de retenção</th>
              <th scope="col">Pedidos</th>
              <th scope="col">Retidos</th>
              <th scope="col">Cancelados</th>
              <th scope="col">Quem derrubou nesta hora</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.total ? "Total geral do dia" : formatFaixa(d.label)}</th>
                <td>{formatTx(d.txRetencao)}</td>
                <td>{d.pedidos}</td>
                <td>{d.retidos}</td>
                <td>{d.cancelados}</td>
                <td>
                  {d.operadores
                    .filter((o) => (o.impacto ?? 0) > 0.0005)
                    .slice(0, 3)
                    .map((o) => `${deriveNomeOperador(o.login)} (${formatImpacto(o.impacto)})`)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
