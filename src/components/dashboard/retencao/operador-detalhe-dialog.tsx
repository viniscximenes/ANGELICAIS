"use client";

import { useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { getDataPngHoje } from "@/components/dashboard/export-popup-png-theme";
import { StyledCard } from "@/components/gestor/styled-card";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";

interface Props {
  operador: OperadorIndividual | null;
  nomeExibido: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: number;
  /** Quartil do operador nos dois escopos. null quando indisponível. */
  quartil?: QuartilOperador | null;
}

function formatTx(tx: number | null): string {
  return tx !== null ? `${(tx * 100).toFixed(1)}%` : "—";
}

// Rótulos das pontas do eixo ("< 08" / "≥ 20", vindos de
// get-por-operador-individual.ts, mesmo formato de get-evolucao-hora.ts)
// reescritos só pra EXIBIÇÃO — mesmo critério do card "Evolução de Taxa e
// Pedidos da Equipe" (grafico-evolucao.tsx, lido por referência, não
// importado daqui pra não acoplar este modal ao componente do Analítico).
function formatEixoLabel(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return label;
}

// Cores dos chips de quartil: MESMOS tokens/tons de
// quartil-faixa.tsx (ESTILO_POR_NIVEL, /kpi/evolucao — lido por referência,
// não importado, pra não acoplar rotas diferentes) — Q1/Q2 verde (Q1 mais
// claro), Q3/Q4 vermelho (Q3 mais claro), via color-mix sobre
// --success/--danger.
const ESTILO_QUARTIL: Record<"Q1" | "Q2" | "Q3" | "Q4", { bg: string; fg: string; bd: string }> = {
  Q1: {
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    fg: "var(--success)",
    bd: "color-mix(in srgb, var(--success) 28%, transparent)",
  },
  Q2: {
    bg: "color-mix(in srgb, var(--success) 20%, transparent)",
    fg: "var(--success)",
    bd: "color-mix(in srgb, var(--success) 42%, transparent)",
  },
  Q3: {
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    fg: "var(--danger)",
    bd: "color-mix(in srgb, var(--danger) 28%, transparent)",
  },
  Q4: {
    bg: "color-mix(in srgb, var(--danger) 20%, transparent)",
    fg: "var(--danger)",
    bd: "color-mix(in srgb, var(--danger) 42%, transparent)",
  },
};

function ChipQuartil({
  rotulo,
  quartil,
  rank,
  totalOperadores,
}: {
  rotulo: string;
  quartil: "Q1" | "Q2" | "Q3" | "Q4";
  rank: number | null;
  totalOperadores: number;
}) {
  const estilo = ESTILO_QUARTIL[quartil];
  return (
    <div
      className="ds-small inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-muted-foreground"
      style={{ backgroundColor: estilo.bg, borderColor: estilo.bd }}
    >
      <span>{rotulo}:</span>
      <strong className="font-semibold" style={{ color: estilo.fg }}>
        {quartil}
      </strong>
      <span className="text-muted-foreground/70">
        ({rank}/{totalOperadores})
      </span>
    </div>
  );
}

export function OperadorDetalheDialog({
  operador,
  nomeExibido,
  open,
  onOpenChange,
  meta = 65,
  quartil = null,
}: Props) {
  const pngRef = useRef<HTMLDivElement>(null);

  if (!operador) return null;

  // Nome real (login antes do @) — esta tela não tem nome fantasia/anonimização.
  const nomeReal = operador.login.split("@")[0] || operador.login;
  const { file: dataFile } = getDataPngHoje();

  const resumo = [
    { label: "TX Retenção", valor: formatTx(operador.tx) },
    { label: "Total Pedidos", valor: operador.total.toLocaleString("pt-BR") },
    { label: "Clientes Retidos", valor: operador.retidos.toLocaleString("pt-BR") },
    { label: "Clientes Cancelados", valor: operador.cancelados.toLocaleString("pt-BR") },
  ];

  const chartData = operador.porHora.map((d) => ({
    ...d,
    txDisplay: d.tx !== null ? parseFloat((d.tx * 100).toFixed(1)) : null,
  }));

  // Gradiente da linha de retenção: um <linearGradient> único cobrindo a
  // linha inteira, com stops calculados pra trocar de cor EXATAMENTE no
  // ponto (fracionário, por interpolação linear) em que o traço cruza a
  // meta — não arredondado pra uma ponta do segmento. Ex: um trecho que
  // sai de 50% (abaixo) e chega a 100% (acima), com meta 65%, cruza a 30%
  // do caminho entre os dois pontos — antes disso vermelho, depois verde.
  //
  // Cores dos stops usam valor COMPUTADO (resolverTokenCss), não a string
  // "var(--danger)" crua: o export em PNG clona este SVG e serializa num
  // <img> isolado, onde `var()` não tem acesso ao :root da página — sem
  // resolver antes, o gradiente sairia invisível na imagem exportada.
  //
  // type="linear" (não "monotone"): a interpolação do cruzamento acima é
  // linear por definição — usar uma curva monotone faria o traço
  // renderizado divergir ligeiramente da posição calculada do cruzamento.
  //
  // Um <Line> só (não múltiplos por segmento): a tentativa anterior com
  // várias <Line> só conseguia trocar de cor nas PONTAS dos segmentos,
  // nunca no meio — não dá pra representar um cruzamento no meio do
  // trecho sem gradiente.
  // Escopo do tema Zen Linen (reports-consolidado.css): resolvido a partir
  // de QUALQUER elemento com [data-page="reports-consolidado"] já montado no
  // DOM — este Dialog roda em portal (document.body), então a raiz do
  // documento (comportamento padrão de resolverTokenCss) NÃO carrega os
  // tokens escopados dessa rota; ler do container real da página (sempre
  // montado enquanto o modal está aberto) evita cair no --danger/--success
  // genérico do tema global. Mesmo padrão de use-chart-colors.ts.
  const elementoEscopoTema =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>('[data-page="reports-consolidado"]')
      : null;
  const corAbaixoMeta = resolverTokenCss("--danger", "#dc2626", elementoEscopoTema);
  const corAcimaMeta = resolverTokenCss("--success", "#16a34a", elementoEscopoTema);

  // Fonte do tema (Instrument Sans / --font-zen-sans): a variável é gerada
  // por next/font e só existe como classe (`zenSans.variable`) no elemento
  // raiz da página real — este Dialog é renderizado em portal (fora dessa
  // árvore), então `var(--font-zen-sans)` fica indefinida ali e invalida
  // TODA a declaração `font-family` (uma var() não resolvida invalida a
  // propriedade inteira em vez de só pular pro próximo nome da lista de
  // fallback), caindo na fonte herdada de fora do tema. Resolve o
  // `font-family` já COMPUTADO (string final, sem var() pendente) no
  // container real da página e aplica direto no DialogContent, igual à
  // mesma técnica usada acima pra --danger/--success.
  const fontFamilyEscopo = elementoEscopoTema
    ? getComputedStyle(elementoEscopoTema).fontFamily
    : undefined;
  const META_GRADIENT_ID = "linha-retencao-meta-gradient";

  const indicesComDado = chartData
    .map((d, idx) => (d.txDisplay !== null ? idx : null))
    .filter((idx): idx is number => idx !== null);

  const primeiroIdx = indicesComDado[0];
  const ultimoIdx = indicesComDado[indicesComDado.length - 1];
  const spanIdx = primeiroIdx !== undefined && ultimoIdx !== undefined ? ultimoIdx - primeiroIdx : 0;

  function offsetDoIndice(idxFracionario: number): number {
    if (spanIdx <= 0 || primeiroIdx === undefined) return 0;
    return (idxFracionario - primeiroIdx) / spanIdx;
  }

  const stopsGradiente: { offset: number; cor: string }[] = [];

  // Um stop na cor do próprio ponto, pra cada ponto com dado — cobre os
  // trechos que NÃO cruzam a meta (as duas pontas na mesma cor).
  indicesComDado.forEach((idx) => {
    const abaixo = chartData[idx].txDisplay! < meta;
    stopsGradiente.push({ offset: offsetDoIndice(idx), cor: abaixo ? corAbaixoMeta : corAcimaMeta });
  });

  // Pra cada trecho que CRUZA a meta, insere dois stops bem próximos no
  // ponto exato de cruzamento — troca "seca" de cor, sem gradiente suave.
  indicesComDado.slice(0, -1).forEach((idx, i) => {
    const proxIdx = indicesComDado[i + 1];
    const valorInicial = chartData[idx].txDisplay!;
    const valorFinal = chartData[proxIdx].txDisplay!;
    const inicioAbaixo = valorInicial < meta;
    const fimAbaixo = valorFinal < meta;
    if (inicioAbaixo === fimAbaixo) return;

    const fracaoCruzamento = (meta - valorInicial) / (valorFinal - valorInicial);
    const idxCruzamento = idx + fracaoCruzamento * (proxIdx - idx);
    const offsetCruzamento = offsetDoIndice(idxCruzamento);
    const offsetSegmento = offsetDoIndice(proxIdx) - offsetDoIndice(idx);
    const epsilon = Math.max(0.0008, offsetSegmento * 0.01);

    stopsGradiente.push(
      { offset: Math.max(0, offsetCruzamento - epsilon), cor: inicioAbaixo ? corAbaixoMeta : corAcimaMeta },
      { offset: Math.min(1, offsetCruzamento + epsilon), cor: fimAbaixo ? corAbaixoMeta : corAcimaMeta },
    );
  });

  stopsGradiente.sort((a, b) => a.offset - b.offset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        data-page="reports-consolidado": este DialogContent é renderizado em
        portal (document.body), fora da árvore [data-page] da rota — sem o
        atributo aqui, --background/--popover/--border etc. caem no :root
        genérico (cinza-frio fora do tema Zen Linen). MESMA técnica já usada
        no PopoverContent de config-metas-popover.tsx.
      */}
      <DialogContent
        data-page="reports-consolidado"
        className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-4xl bg-background border-border/80 p-6 shadow-2xl"
        style={fontFamilyEscopo ? { fontFamily: fontFamilyEscopo } : undefined}
      >

        <ExportPopupPngButton
          contentRef={pngRef}
          filename={`${nomeReal}_${dataFile}.png`}
          className="absolute top-2 right-10"
          corDeFundoDoAlvo
          toastClassName="reports-consolidado-toast"
        />

        {/*
          Sem template separado pra exportação: o PNG captura este mesmo
          wrapper (via pngRef + ExportPopupPngButton), com background
          explícito porque o fundo do DialogContent fica no ancestral, fora
          do que é capturado. Assim a imagem sempre reflete o tema atual
          (claro/escuro), a ordem real dos cards, a moldura com cantoneiras e
          o cabeçalho neutro da tabela — sem divergir do que está na tela.
        */}
        <div ref={pngRef} style={{ backgroundColor: "var(--background)" }}>
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-dashed border-border/60 pb-3 space-y-1.5">
          <DialogTitle className="ds-h3 text-foreground font-semibold tracking-tight text-xl">
            {nomeExibido}
          </DialogTitle>
          {quartil && (quartil.equipe.quartil || quartil.empresa.quartil) && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {quartil.equipe.quartil && (
                <ChipQuartil
                  rotulo="Quartil Equipe"
                  quartil={quartil.equipe.quartil}
                  rank={quartil.equipe.rank}
                  totalOperadores={quartil.equipe.totalOperadores}
                />
              )}
              {quartil.empresa.quartil && (
                <ChipQuartil
                  rotulo="Quartil Empresa"
                  quartil={quartil.empresa.quartil}
                  rank={quartil.empresa.rank}
                  totalOperadores={quartil.empresa.totalOperadores}
                />
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ── Resumo ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.map((c, idx) => {
              const metaFracao = meta / 100;
              const abaixo = operador.tx === null || operador.tx < metaFracao;
              const valueColorClass = idx === 0 ? (abaixo ? "text-danger" : "text-success") : "text-foreground";

              return (
                // Mesma caixa neutra dos cards de número já padronizados em
                // visao-geral-cards.tsx (border-border + bg-card/70 +
                // shadow-[var(--shadow-sm)] + backdrop-blur-md), sem
                // cantoneiras — StyledCard fica só pro container do gráfico
                // e da tabela abaixo.
                <div
                  key={c.label}
                  className="flex flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 px-4 py-3.5 shadow-[var(--shadow-sm)] backdrop-blur-md"
                >
                  <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
                    {c.label}
                  </p>
                  <p className={`ds-display text-2xl font-semibold tabular-nums ${valueColorClass}`}>
                    {c.valor}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Evolução por hora ──────────────────────────────── */}
          <div className="space-y-2">
            <h3 className="ds-h3 font-semibold text-foreground">
              Evolução por Hora
            </h3>
            <StyledCard className="p-4" withGradient>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={META_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
                        {stopsGradiente.map((s, i) => (
                          <stop key={i} offset={s.offset} stopColor={s.cor} />
                        ))}
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
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />
                    
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, opacity: 0.5 }}
                    />

                    {/* Custom Tooltip */}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const info = payload[0].payload as typeof chartData[0];
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
                          </div>
                        );
                      }}
                    />

                    {/* Fundo do Volume (Barras) */}
                    <Bar
                      yAxisId="right"
                      dataKey="total"
                      barSize={24}
                      radius={[4, 4, 0, 0]}
                      animationDuration={300}
                      animationEasing="ease-out"
                    >
                      {chartData.map((entry, index) => {
                        const isBelow = entry.txDisplay !== null && entry.txDisplay < meta;
                        const cellColor = isBelow ? "var(--danger)" : "var(--success)";
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={cellColor}
                            opacity={0.15}
                          />
                        );
                      })}
                    </Bar>

                    {/* Referência da Meta */}
                    <ReferenceLine
                      yAxisId="left"
                      y={meta}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.8}
                      label={{
                        value: `Meta: ${meta.toFixed(0)}%`,
                        position: "insideBottomLeft",
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                        offset: 5,
                      }}
                    />

                    {/* Linha da Retenção — um <Line> só, colorido pelo
                        gradiente calculado acima (stopsGradiente), que troca
                        de cor exatamente no ponto de cruzamento com a meta.
                        Fallback sólido depois do url() pro caso raro do
                        gradiente não estar pronto no primeiro frame (SVG
                        aceita cor de fallback após a referência ao gradiente). */}
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="txDisplay"
                      stroke={`url(#${META_GRADIENT_ID}) ${corAbaixoMeta}`}
                      strokeWidth={2.5}
                      animationDuration={350}
                      animationEasing="ease-out"
                      dot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                        const { cx, cy, payload } = props;
                        if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                        const isBelow = payload.txDisplay < meta;
                        const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                        return (
                          <circle
                            key={`dot-${payload.label}`}
                            cx={cx}
                            cy={cy}
                            r={4}
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
                            r={6}
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

          {/* ── Retenção por tema ──────────────────────────────── */}
          <div className="space-y-2">
            <h3 className="ds-h3 font-semibold text-foreground">
              Retenção por Tema
            </h3>
            <StyledCard className="p-0 overflow-hidden" withGradient>
              {operador.porMotivo.length === 0 ? (
                <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                  Nenhum atendimento registrado para este operador no dia.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      {/* Mesma tipografia de cabeçalho de tabela-temas.tsx
                          (ds-body + font-bold uppercase tracking-wider
                          text-[11px]) — antes era ds-mono-sm, destoando do
                          resto da página. */}
                      <tr className="ds-body text-muted-foreground border-border/40 border-b bg-muted/40 text-[11px] font-bold tracking-wider uppercase">
                        <th className="px-4 py-2.5 font-semibold">Motivo</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Retidos</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Cancelados</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Pedidos</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Taxa de Retenção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operador.porMotivo.map((m) => {
                        // Mesma regra de cor de tabela-temas.tsx
                        // (text-danger/text-success vs. meta) — este modal só
                        // recebe a meta GLOBAL via prop (`meta`), sem o mapa
                        // por tema (themeMetas) que a tabela principal tem,
                        // então usa a mesma meta global pra todas as linhas.
                        const abaixo = m.tx === null || m.tx < meta / 100;
                        const txColor = m.tx === null ? "text-muted-foreground" : abaixo ? "text-danger" : "text-success";
                        return (
                          <tr
                            key={m.motivo}
                            className="border-border/20 hover:bg-accent border-b transition-colors last:border-0"
                          >
                            <td className="text-foreground ds-body max-w-[220px] truncate px-4 py-2.5 text-xs font-medium">
                              {m.motivo}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {m.retidos}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {m.cancelados}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {m.total}
                            </td>
                            <td className={`ds-mono-sm px-4 py-2.5 text-center text-xs font-semibold tabular-nums ${txColor}`}>
                              {formatTx(m.tx)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </StyledCard>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
