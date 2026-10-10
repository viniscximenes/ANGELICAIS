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

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { classeStatusTma, corStatusTma } from "@/lib/tma/format-tma";
import type { TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import { statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "@/lib/tma/tma-status-pure";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";

/**
 * "Evolução da equipe" do TMA (Analítico) e "Evolução por hora" do modal do
 * operador — MESMO visual e regras do EvolucaoEquipe do Consolidado
 * (dashboard/retencao/evolucao-equipe.tsx): barras de volume por hora +
 * coluna "Total geral", linha do TMA com etiqueta em cada hora (verde/
 * vermelho pela meta), meta tracejada, eixos Y ocultos (todo valor já vem
 * escrito), horas vazias das pontas recortadas, teclado (←/→) e tabela
 * sr-only para leitor de tela.
 *
 * Adaptações ao TMA: uma série de barras só (Atendimentos — não há
 * retidos/cancelados), etiqueta em MM:SS, cor pela regra de statusTmaDe
 * (respeita `direction`; no TMA, lower_better, abaixo da meta é bom) e, no
 * tooltip, os operadores com TMA fora da meta naquela hora em vez de "quem
 * derrubou".
 *
 * ⚠️ NUNCA renderizar dentro de [data-tma-png] (cópia do "Copiar imagem"):
 * o tooltip lista e-mails em formato LITERAL (parte local) — decisão do
 * usuário, exceção à regra de nome fantasia que só vale em tela.
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

function formatTma(segundos: number | null): string {
  return segundos === null ? "—" : formatKpiValue(segundos, "time");
}

/** Recorta as horas vazias das pontas (antes do 1º e depois do último atendimento). */
function recortarHoras(dados: TmaHoraData[]): TmaHoraData[] {
  const primeiro = dados.findIndex((h) => h.total > 0);
  if (primeiro === -1) return [];
  let ultimo = dados.length - 1;
  while (ultimo > primeiro && dados[ultimo].total === 0) ultimo--;
  return dados.slice(primeiro, ultimo + 1);
}

const COR_ATENDIMENTOS = "color-mix(in oklab, var(--foreground) 78%, transparent)";

const LABEL_TOTAL = "Total";

/** Faixa mínima (s) da escala do TMA — evita uma linha "nervosa" quando as horas variam poucos segundos. */
const FAIXA_MINIMA_SEGUNDOS = 60;

function Legenda({ threshold }: { threshold: number | null }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: COR_ATENDIMENTOS }} />
        Atendimentos
      </span>
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
    </div>
  );
}

/** Etiqueta do TMA em caixa: borda na cor do veredito, texto na tinta do tema (mesma do Consolidado). */
function EtiquetaTma({ x, y, valor, status }: { x: number; y: number; valor: number; status: TmaStatus }) {
  const texto = formatKpiValue(valor, "time");
  const largura = texto.length * 6.6 + 12;
  return (
    <g pointerEvents="none">
      <rect
        x={x - largura / 2}
        y={y - 30}
        width={largura}
        height={19}
        rx={4}
        fill="var(--background)"
        stroke={corStatusTma(status)}
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
  atendimentos: number;
  tma: number | null;
  status: TmaStatus;
  foraDaMeta: TmaHoraData["abaixoDaMeta"];
  total: boolean;
  tmaHora: number | null;
  tmaTotal: number | null;
};

type PropsPonto = { cx?: number; cy?: number; payload?: PontoGrafico; index?: number };

interface EvolucaoTmaChartProps {
  dados: TmaHoraData[];
  thresholdConfig: TmaThresholdConfig;
  /** Sem título (ex.: modal do operador, que tem o próprio). */
  titulo?: string;
  descricao?: string;
  /** Altura do gráfico em px (380 no Analítico; menor no modal). */
  altura?: number;
  /** Lista "Operadores fora da meta" no tooltip — desligada no modal (é sempre 1 operador). */
  mostrarOperadores?: boolean;
}

export function EvolucaoTmaChart({
  dados,
  thresholdConfig,
  titulo,
  descricao,
  altura = 380,
  mostrarOperadores = true,
}: EvolucaoTmaChartProps) {
  const horas = useMemo(() => recortarHoras(dados), [dados]);
  // Id único do gradiente: Analítico e modal do operador podem estar na tela
  // ao mesmo tempo — com o mesmo id, um usaria o gradiente do outro.
  const gradId = `evol-tma-grad-${useId().replace(/:/g, "")}`;
  const threshold = thresholdConfig.threshold;

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
        {/* Mesmo estado vazio do Consolidado: gráfico esqueleto parado, sem
            container, com a mensagem no centro. */}
        <GraficoVazio
          titulo="Sem atendimentos por hora"
          descricao="Nenhum atendimento com horário registrado na base do dia."
          altura={Math.min(altura, 320)}
        />
      </div>
    );
  }

  // Total geral: TMA PONDERADO do dia (soma das durações ÷ atendimentos),
  // a partir das médias por hora × volume — mesma conta do card TMA.
  const totalAtendimentos = horas.reduce((acc, h) => acc + h.total, 0);
  const somaSegundos = horas.reduce((acc, h) => acc + (h.tmaMedioSegundos ?? 0) * h.total, 0);
  const tmaDoDia = totalAtendimentos > 0 ? somaSegundos / totalAtendimentos : null;

  const chartData: PontoGrafico[] = [
    ...horas.map((h) => ({
      label: h.label,
      atendimentos: h.total,
      tma: h.tmaMedioSegundos,
      status: h.status,
      foraDaMeta: h.abaixoDaMeta,
      total: false,
      tmaHora: h.tmaMedioSegundos,
      tmaTotal: null,
    })),
    {
      label: LABEL_TOTAL,
      atendimentos: totalAtendimentos,
      tma: tmaDoDia,
      status: statusTmaDe(tmaDoDia, thresholdConfig),
      foraDaMeta: [],
      total: true,
      tmaHora: null,
      tmaTotal: tmaDoDia,
    },
  ];

  const valores = chartData
    .flatMap((d) => [d.tmaHora, d.tmaTotal])
    .filter((v): v is number => v !== null);

  // Cores já resolvidas (não "var(--…)"): o "baixar PNG" do modal serializa
  // o SVG num <img> isolado, onde var() não resolve — o gradiente sumiria da
  // imagem. Mesma técnica do Consolidado.
  const escopo =
    typeof document !== "undefined" ? document.querySelector<HTMLElement>('[data-page="reports-tma-peso"]') : null;
  const corSucesso = resolverTokenCss("--success", "#16a34a", escopo);
  const corPerigo = resolverTokenCss("--danger", "#dc2626", escopo);
  const corNeutra = resolverTokenCss("--foreground", "#0a0a0a", escopo);

  // Gradiente vertical da linha: troca de cor na altura da meta. Lado de
  // cima = valores MAIORES; com lower_better (TMA) o de cima é o ruim.
  const dataMax = valores.length > 0 ? Math.max(...valores) : 0;
  const dataMin = valores.length > 0 ? Math.min(...valores) : 0;
  const topoEhBom = thresholdConfig.direction === "higher_better";
  const corTopo = topoEhBom ? corSucesso : corPerigo;
  const corBase = topoEhBom ? corPerigo : corSucesso;
  const gradientOffset =
    threshold === null || dataMax <= threshold
      ? 0
      : dataMin >= threshold
        ? 1
        : (dataMax - threshold) / (dataMax - dataMin);

  // Linha RETA (todas as horas com o mesmo valor) ou sem meta: a caixa do
  // path de altura zero não desenha gradiente em objectBoundingBox (a linha
  // sumia) — cor sólida do veredito. Mesma regra do Consolidado.
  const tmaHoras = chartData.map((d) => d.tmaHora).filter((v): v is number => v !== null);
  const linhaReta = tmaHoras.length > 0 && tmaHoras.every((v) => v === tmaHoras[0]);
  const corSolida = (status: TmaStatus) =>
    status === "danger" ? corPerigo : status === "success" ? corSucesso : corNeutra;
  const strokeTma =
    threshold === null
      ? corNeutra
      : linhaReta
        ? corSolida(statusTmaDe(tmaHoras[0], thresholdConfig))
        : `url(#${gradId})`;

  // Duas faixas sem sobreposição: a linha do TMA ocupa a metade de cima e as
  // barras a metade de baixo (mesma divisão do Consolidado).
  const comMeta = threshold !== null ? [threshold, ...valores] : valores;
  const minTma = Math.min(...comMeta);
  const maxTma = Math.max(...comMeta);
  const faixaTma = Math.max(maxTma - minTma, FAIXA_MINIMA_SEGUNDOS);
  const dominioTma: [number, number] = [minTma - faixaTma * 1.3, maxTma + faixaTma * 0.25];
  const maxQtd = Math.max(...chartData.map((d) => d.atendimentos), 1);
  const dominioQtd: [number, number] = [0, maxQtd * 2.1];

  const rotuloBarra = {
    position: "top" as const,
    fill: "var(--muted-foreground)",
    fontSize: 10,
    offset: 4,
  };

  const pontoTma = (chave: "tmaHora" | "tmaTotal") =>
    function Ponto(props: PropsPonto) {
      const { cx, cy, payload, index } = props;
      const valor = payload?.[chave] ?? null;
      if (cx === undefined || cy === undefined || !payload || valor === null) {
        return <g key={`${chave}-${index}`} />;
      }
      return (
        <g key={`${chave}-${index}`}>
          <circle cx={cx} cy={cy} r={4} fill={corStatusTma(payload.status)} stroke="var(--background)" strokeWidth={2} />
          <EtiquetaTma x={cx} y={cy} valor={valor} status={payload.status} />
        </g>
      );
    };

  const foraDaMetaDe = (d: PontoGrafico) =>
    [...d.foraDaMeta].sort((a, b) => b.tmaMedioSegundos - a.tmaMedioSegundos);

  return (
    <div className="space-y-3">
      {cabecalho}
      <Legenda threshold={threshold} />
      {/* grafico-evolucao-chart: regra de reports-tma-peso.css que tira o
          contorno de foco ao CLICAR no gráfico e mostra o anel no teclado. */}
      <div
        className="grafico-evolucao-chart w-full [&_*:focus:not(:focus-visible)]:outline-none"
        style={{ height: altura }}
      >
        {/* initialDimension: o Recharts mede o contêiner depois de montar; com o
            padrão (-1) avisava "width(-1) and height(-1)" no console quando o
            gráfico nasce num slide/modal ainda sem tamanho. */}
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <ComposedChart
            // Teclado: Tab foca o gráfico e ←/→ percorrem as horas mostrando o
            // mesmo tooltip do ponteiro. Sem title/desc (virariam dica nativa
            // do navegador por cima do tooltip); a descrição para leitor de
            // tela fica na tabela sr-only abaixo.
            accessibilityLayer
            data={chartData}
            margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
            barCategoryGap="22%"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor={corTopo} />
                <stop offset={gradientOffset} stopColor={corTopo} />
                <stop offset={gradientOffset} stopColor={corBase} />
                <stop offset={1} stopColor={corBase} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickFormatter={(l: string) => (l === LABEL_TOTAL ? "Total geral" : formatEixo(l))}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
            />
            <YAxis yAxisId="tma" domain={dominioTma} hide />
            <YAxis yAxisId="qtd" domain={dominioQtd} hide />

            <Bar
              yAxisId="qtd"
              dataKey="atendimentos"
              name="Atendimentos"
              fill={COR_ATENDIMENTOS}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            >
              <LabelList dataKey="atendimentos" {...rotuloBarra} />
            </Bar>

            {threshold !== null && (
              <ReferenceLine
                yAxisId="tma"
                y={threshold}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
            )}
            <Line
              yAxisId="tma"
              type="linear"
              dataKey="tmaHora"
              name="TMA"
              stroke={strokeTma}
              strokeWidth={2.5}
              connectNulls={false}
              isAnimationActive={false}
              dot={pontoTma("tmaHora")}
              activeDot={false}
            />
            {/* Ponto do Total: série própria, sem linha ligando à última hora. */}
            <Line
              yAxisId="tma"
              dataKey="tmaTotal"
              name="TMA (total)"
              stroke="none"
              isAnimationActive={false}
              dot={pontoTma("tmaTotal")}
              activeDot={false}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const info = payload[0].payload as PontoGrafico;
                if (info.atendimentos === 0) return null;
                const foraDaMeta = mostrarOperadores ? foraDaMetaDe(info) : [];
                return (
                  <div className="bg-popover border-border/80 w-72 rounded-lg border p-3 font-sans shadow-md">
                    <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                      {info.total ? "Total geral do dia" : formatFaixa(info.label)}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className={`font-semibold tabular-nums ${classeStatusTma(info.status)}`}>
                        {formatTma(info.tma)}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {info.atendimentos} {info.atendimentos === 1 ? "atendimento" : "atendimentos"}
                    </p>
                    {foraDaMeta.length > 0 && (
                      <>
                        <div className="bg-border/60 my-2 h-px" />
                        <p className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
                          Operadores fora da meta
                        </p>
                        {/* E-mail LITERAL (parte local) — decisão do usuário,
                            só em tela (ver aviso no topo do arquivo). */}
                        <ul className="space-y-0.5">
                          {foraDaMeta.map((op) => (
                            <li key={op.emailLocal} className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="text-foreground truncate">{op.emailLocal}</span>
                              <span className="text-danger shrink-0 tabular-nums">
                                {formatKpiValue(op.tmaMedioSegundos, "time")}
                              </span>
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
          Alternativa ao gráfico para leitor de tela (mesma do Consolidado):
          o detalhe por hora só existia no tooltip. sr-only — não muda nada no
          visual. Fica DENTRO do contêiner do gráfico: como irmã no
          space-y-3, o gráfico deixaria de ser o último filho e ganharia
          margem embaixo.
        */}
        <table className="sr-only">
          <caption>{titulo ?? "Evolução por hora"}: TMA e atendimentos em cada faixa de horário</caption>
          <thead>
            <tr>
              <th scope="col">Faixa</th>
              <th scope="col">TMA</th>
              <th scope="col">Atendimentos</th>
              {mostrarOperadores && <th scope="col">Operadores fora da meta</th>}
            </tr>
          </thead>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.total ? "Total geral do dia" : formatFaixa(d.label)}</th>
                <td>{formatTma(d.tma)}</td>
                <td>{d.atendimentos}</td>
                {mostrarOperadores && (
                  <td>
                    {foraDaMetaDe(d)
                      .map((op) => `${op.emailLocal} (${formatKpiValue(op.tmaMedioSegundos, "time")})`)
                      .join(", ") || "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
