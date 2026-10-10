"use client";

import { useMemo, useRef } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { formatFaixaHora } from "@/components/dashboard/retencao/grafico-evolucao";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import {
  bucketDaSkill,
  SKILL_BUCKET_LABELS,
  SKILL_BUCKET_ORDER,
  type SkillBucket,
} from "@/lib/tma/skills-retencao";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { classeStatusTma, corStatusTma, formatDistanciaMetaTma, formatEixoLabelTma } from "@/lib/tma/format-tma";
import { calcularEvolucaoTmaPorHora, type TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import { statusTmaDe, type TmaThresholdConfig } from "@/lib/tma/tma-status-pure";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";
import type { TmaLinha } from "./tma-table";

/** Título de bloco + linha até a borda — mesmo padrão do modal do Consolidado. */
function TituloBloco({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="ds-h3 shrink-0 font-semibold text-foreground">{children}</h3>
      <div aria-hidden="true" className="bg-border h-px flex-1" />
    </div>
  );
}

interface TmaDetalheDialogProps {
  operador: TmaLinha | null;
  /** Atendimentos do operador; null enquanto carregam (busca sob demanda em TmaTable). */
  atendimentos: AtendimentoTma[] | null;
  /** true quando a busca dos atendimentos falhou. */
  erroAtendimentos: boolean;
  /** Threshold/direção efetivos do TMA (getTmaThresholdConfig) — MESMO usado na tabela principal e no Analítico, pra referência de meta no gráfico "TMA por Hora" deste operador. */
  thresholdConfig: TmaThresholdConfig;
  onOpenChange: (open: boolean) => void;
}

export function TmaDetalheDialog({
  operador,
  atendimentos: atendimentosOuNull,
  erroAtendimentos,
  thresholdConfig,
  onOpenChange,
}: TmaDetalheDialogProps) {
  const pngRef = useRef<HTMLDivElement>(null);
  const atendimentos = atendimentosOuNull ?? [];

  // 7 buckets (Hotline + Reversão Churn somadas), espelhando as colunas de
  // "queda por skill" da tabela principal — não as 8 skills cruas.
  const qtdPorBucket = new Map<SkillBucket, number>();
  const somaPorBucket = new Map<SkillBucket, number>();
  for (const at of atendimentos) {
    const bucket = at.skill ? bucketDaSkill(at.skill) : null;
    if (!bucket) continue;
    qtdPorBucket.set(bucket, (qtdPorBucket.get(bucket) ?? 0) + 1);
    somaPorBucket.set(bucket, (somaPorBucket.get(bucket) ?? 0) + at.duracaoSegundos);
  }
  const total = atendimentos.length;

  // Tabela "TMA por tema" (substitui o gráfico de rosquinha + a lista de
  // barras): só os temas com atendimento, com quantidade, participação no
  // total e TMA médio do operador naquele tema — mesmas informações de antes.
  const linhasPorTema = SKILL_BUCKET_ORDER.filter((b) => (qtdPorBucket.get(b) ?? 0) > 0).map((bucket) => {
    const qtd = qtdPorBucket.get(bucket) ?? 0;
    const tma = qtd > 0 ? (somaPorBucket.get(bucket) ?? 0) / qtd : null;
    return {
      bucket,
      label: SKILL_BUCKET_LABELS[bucket],
      qtd,
      pct: total > 0 ? (qtd / total) * 100 : 0,
      tma,
      status: statusTmaDe(tma, thresholdConfig),
    };
  });

  // "TMA por Hora" deste operador — reaproveita calcularEvolucaoTmaPorHora
  // (get-gestor-tma-evolucao-hora.ts, MESMA função do gráfico "Evolução do
  // TMA" do Analítico), só filtrando os atendimentos pra este operador antes
  // de chamar — sem duplicar a lógica de bucketDe/threshold. `operator_email`
  // é um placeholder fixo (a função agrupa por email só pra montar a lista
  // "abaixoDaMeta" por bucket, que este modal não usa — sempre 1 operador
  // aqui, então o campo não influencia soma/qtd/status por bucket).
  const evolucaoPorHora: TmaHoraData[] = calcularEvolucaoTmaPorHora(
    atendimentos.map((at) => ({
      operator_email: "operador",
      hora: at.hora,
      duracao_segundos: at.duracaoSegundos,
    })),
    thresholdConfig,
  );
  const threshold = thresholdConfig.threshold;

  // Gradiente da linha "TMA por Hora": MESMA técnica de
  // OperadorDetalheDialog do Consolidado (dashboard/retencao/
  // operador-detalhe-dialog.tsx, lido por referência, NÃO editado nem
  // importado) — um <linearGradient> único cobrindo a linha inteira, com
  // stops calculados pra trocar de cor EXATAMENTE no ponto (fracionário, por
  // interpolação linear) em que o traço cruza a meta, não arredondado pra
  // uma ponta do segmento. Verde = dentro da meta pela MESMA regra de
  // statusTmaDe (respeita `direction`; no TMA, lower_better, abaixo da meta é
  // bom), vermelho = fora. Cores via resolverTokenCss
  // (valor COMPUTADO, não a string "var()" crua): o export em PNG clona
  // este SVG num <img> isolado, onde var() não resolve sem acesso ao :root
  // da página.
  // Lidas uma vez por operador aberto (não a cada render): querySelector +
  // getComputedStyle rodavam em todo render do modal.
  // Relê ao abrir outro operador (o tema pode ter mudado entre aberturas);
  // fechado, não lê nada.
  const { corAbaixoMeta, corAcimaMeta } = useMemo(() => {
    const temaTma =
      operador === null || typeof document === "undefined"
        ? null
        : document.querySelector<HTMLElement>('[data-page="reports-tma-peso"]');
    return {
      corAbaixoMeta: temaTma ? resolverTokenCss("--success", "#16a34a", temaTma) : "#16a34a",
      corAcimaMeta: temaTma ? resolverTokenCss("--danger", "#dc2626", temaTma) : "#dc2626",
    };
  }, [operador]);
  const TMA_META_GRADIENT_ID = "linha-tma-meta-gradient";

  const indicesComDado = evolucaoPorHora
    .map((d, idx) => (d.tmaMedioSegundos !== null ? idx : null))
    .filter((idx): idx is number => idx !== null);

  const primeiroIdx = indicesComDado[0];
  const ultimoIdx = indicesComDado[indicesComDado.length - 1];
  const spanIdx = primeiroIdx !== undefined && ultimoIdx !== undefined ? ultimoIdx - primeiroIdx : 0;

  function offsetDoIndice(idxFracionario: number): number {
    if (spanIdx <= 0 || primeiroIdx === undefined) return 0;
    return (idxFracionario - primeiroIdx) / spanIdx;
  }

  const stopsGradiente: { offset: number; cor: string }[] = [];

  if (threshold !== null) {
    // Um stop na cor do próprio ponto, pra cada ponto com dado — cobre os
    // trechos que NÃO cruzam a meta (as duas pontas na mesma cor).
    // "Dentro da meta" = statusTmaDe (direção + igualdade), a MESMA regra das
    // bolinhas e da tabela — antes era `< threshold` fixo, que ignorava a
    // direção e pintava o valor igual à meta de vermelho.
    const dentroDaMeta = (valor: number) => statusTmaDe(valor, thresholdConfig) === "success";

    indicesComDado.forEach((idx) => {
      const dentro = dentroDaMeta(evolucaoPorHora[idx].tmaMedioSegundos!);
      stopsGradiente.push({ offset: offsetDoIndice(idx), cor: dentro ? corAbaixoMeta : corAcimaMeta });
    });

    // Pra cada trecho que CRUZA a meta, insere dois stops bem próximos no
    // ponto exato de cruzamento — troca "seca" de cor, sem gradiente suave.
    // SEM interpolar através de buracos (buckets sem atendimento, ver
    // indicesComDado): só entre pontos CONSECUTIVOS com dado — mesmo
    // critério de "não inventar dado" já aplicado ao resto deste gráfico.
    indicesComDado.slice(0, -1).forEach((idx, i) => {
      const proxIdx = indicesComDado[i + 1];
      const valorInicial = evolucaoPorHora[idx].tmaMedioSegundos!;
      const valorFinal = evolucaoPorHora[proxIdx].tmaMedioSegundos!;
      const inicioAbaixo = dentroDaMeta(valorInicial);
      const fimAbaixo = dentroDaMeta(valorFinal);
      if (inicioAbaixo === fimAbaixo) return;

      const fracaoCruzamento = (threshold - valorInicial) / (valorFinal - valorInicial);
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
  }

  const temGradiente = threshold !== null && stopsGradiente.length > 0;

  // Título do modal: e-mail LITERAL (parte local, minúsculo, ex.:
  // "vitoria.dsantos"), não o nome fantasia nem "Nome Sobrenome" — decisão
  // do usuário, exceção deliberada à convenção do site. Vale também pro PNG
  // exportado (nome do arquivo abaixo). Não trocar sem confirmar com o
  // usuário.
  const emailLocal = operador ? (operador.operatorEmail.split("@")[0] ?? operador.operatorEmail).toLowerCase() : "";

  return (
    <Dialog open={operador !== null} onOpenChange={onOpenChange}>
      {/*
        Paridade de borda/largura com OperadorDetalheDialog do Consolidado
        (dashboard/retencao/operador-detalhe-dialog.tsx, lido por referência,
        NÃO editado): sm:max-w-4xl (era sm:max-w-[960px]) + mesma
        border-border/80 já usada.
      */}
      <DialogContent
        data-page="reports-tma-peso"
        // Mesmo visual neumórfico do dialog do operador do Consolidado
        // (globals.css), com data-neu-tile nos KPIs. pagina-padrao: barras
        // de rolagem do padrão também neste portal.
        data-operador-neumorfico
        className="pagina-padrao max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-4xl bg-background border-border/80 p-6 shadow-2xl"
      >
        {operador && (
          <>
            <ExportPopupPngButton
              contentRef={pngRef}
              filename={`tma_${emailLocal}.png`}
              className="absolute top-2 right-10"
              corDeFundoDoAlvo
              toastClassName="toast-padrao"
              showSuccessToast={false}
            />

            {/* Descrição para leitor de tela (o Radix avisa "Missing
                Description" sem ela) — mesmo do modal do Consolidado. sr-only
                e FORA do pngRef: não aparece na tela nem no PNG exportado. */}
            <DialogDescription className="sr-only">
              Detalhe do operador: TMA, atendimentos, evolução por hora e TMA por tema.
            </DialogDescription>

            {/*
              Sem template separado: o PNG captura este mesmo wrapper (via
              pngRef), com background explícito porque o fundo do
              DialogContent fica no ancestral, fora do que é capturado —
              assim a imagem sempre reflete o tema atual (claro/escuro), não
              um tema fixo.
            */}
            <div ref={pngRef} data-tma-detalhe-png style={{ backgroundColor: "var(--background)" }}>
              <DialogHeader className="pb-3 space-y-1.5">
                <DialogTitle className="ds-h3 text-foreground font-semibold tracking-tight text-xl">{emailLocal}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-2">
              {/*
                Resumo — MESMO padrão do modal do Consolidado: sem container
                (sem borda/fundo), rótulo em negrito e valor em negrito; o
                TMA na cor do status (verde dentro da meta, vermelho fora).
              */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div data-neu-tile className="flex flex-col justify-center gap-1 px-4 py-3.5">
                  <p className="ds-small text-muted-foreground mb-1 font-bold tracking-wider uppercase">TMA</p>
                  <p className={`ds-display text-2xl font-bold tabular-nums ${classeStatusTma(operador.status)}`}>
                    {formatKpiValue(operador.tmaSegundos, "time")}
                  </p>
                </div>
                <div data-neu-tile className="flex flex-col justify-center gap-1 px-4 py-3.5">
                  <p className="ds-small text-muted-foreground mb-1 font-bold tracking-wider uppercase">Atendimentos</p>
                  <p className="ds-display text-2xl font-bold tabular-nums text-foreground">
                    {operador.qtdAtendimentos}
                  </p>
                </div>
              </div>

              {/* Atendimentos do operador vêm sob demanda (TmaTable busca ao
                  abrir): enquanto chegam, ou se falharem, os três blocos
                  abaixo dão lugar a um aviso — o resumo acima já vem da linha. */}
              {erroAtendimentos ? (
                <p role="alert" className="ds-small p-6 text-center text-xs" style={{ color: "var(--danger)" }}>
                  Não foi possível carregar os atendimentos deste operador. Feche e abra de novo.
                </p>
              ) : atendimentos === null ? (
                <p role="status" className="ds-small text-muted-foreground p-6 text-center text-xs">
                  Carregando atendimentos...
                </p>
              ) : (
              <>
              {/* ── Evolução por hora ──────────────────────────────── */}
              <div className="space-y-2">
                <TituloBloco>Evolução por hora</TituloBloco>
                {/* Sem a borda de foco ao CLICAR no gráfico; pelo teclado (:focus-visible) ela aparece. */}
                <div className="grafico-evolucao-chart w-full h-[220px] [&_*:focus:not(:focus-visible)]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolucaoPorHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        {temGradiente && (
                          <defs>
                            <linearGradient id={TMA_META_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
                              {stopsGradiente.map((s, i) => (
                                <stop key={i} offset={s.offset} stopColor={s.cor} />
                              ))}
                            </linearGradient>
                          </defs>
                        )}

                        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="4 4" />

                        <XAxis
                          dataKey="label"
                          tickFormatter={formatEixoLabelTma}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        />

                        <YAxis
                          yAxisId="left"
                          tickFormatter={(v: number) => formatKpiValue(v, "time")}
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

                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const info = payload[0].payload as TmaHoraData;
                            // Mesmo visual do tooltip do modal do Consolidado:
                            // faixa da hora em cinza no topo, só o TMA em
                            // destaque (com a distância da meta) e o resto em
                            // texto normal. Hora sem atendimento não mostra.
                            if (info.total === 0 || info.tmaMedioSegundos === null) return null;
                            const cor = classeStatusTma(info.status);
                            return (
                              <div className="bg-popover border border-border/80 w-64 rounded-lg p-3 shadow-md font-sans">
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
                              </div>
                            );
                          }}
                        />

                        <Bar yAxisId="right" dataKey="total" barSize={24} radius={[4, 4, 0, 0]} animationDuration={300} animationEasing="ease-out">
                          {evolucaoPorHora.map((entry, index) => {
                            // Sem meta/sem dado (neutral): cor neutra, não verde.
                            const cellColor =
                              entry.status === "danger"
                                ? "var(--danger)"
                                : entry.status === "success"
                                  ? "var(--success)"
                                  : "var(--muted-foreground)";
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

                        {/*
                          Linha RETA (type="linear", segmentos retos entre
                          buckets — decisão do usuário, não curva suave), com
                          o MESMO gradiente SVG do Consolidado (stopsGradiente
                          acima): a cor troca exatamente no ponto de
                          cruzamento com a meta, não numa transição suave ao
                          longo do gráfico. Fallback sólido (var(--foreground))
                          quando não há meta configurada ou nenhum ponto com
                          dado. SEM connectNulls: um operador não atende toda
                          hora do dia, então buckets sem atendimento ficam
                          como buraco real no traço, não interpolados — "não
                          inventar dado" (stopsGradiente também respeita isso,
                          só cruza entre pontos CONSECUTIVOS com dado).
                        */}
                        <Line
                          yAxisId="left"
                          type="linear"
                          dataKey="tmaMedioSegundos"
                          stroke={temGradiente ? `url(#${TMA_META_GRADIENT_ID})` : "var(--foreground)"}
                          strokeWidth={2.5}
                          animationDuration={350}
                          animationEasing="ease-out"
                          dot={(props: { cx?: number; cy?: number; payload?: TmaHoraData }) => {
                            const { cx, cy, payload } = props;
                            if (!cx || !cy || payload?.tmaMedioSegundos === null || payload?.tmaMedioSegundos === undefined) return null;
                            const dotColor = corStatusTma(payload.status);
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
                          activeDot={(props: { cx?: number; cy?: number; payload?: TmaHoraData }) => {
                            const { cx, cy, payload } = props;
                            if (!cx || !cy || payload?.tmaMedioSegundos === null || payload?.tmaMedioSegundos === undefined) return null;
                            const dotColor = corStatusTma(payload.status);
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
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* ── TMA por tema (substitui o gráfico de rosquinha) ─── */}
              <div className="space-y-2">
                <TituloBloco>TMA por tema</TituloBloco>
                <div className="overflow-hidden">
                  {linhasPorTema.length === 0 ? (
                    <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                      Nenhum atendimento registrado para este operador no dia.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      {/* .cabecalho-tabela: cabeçalho no visual da tabela do
                          modal do Consolidado (globals.css). */}
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="cabecalho-tabela">
                            <th className="px-4 py-2.5 font-semibold">Tema</th>
                            <th className="px-4 py-2.5 text-center font-semibold">Atendimentos</th>
                            <th className="px-4 py-2.5 text-center font-semibold">% do total</th>
                            <th className="px-4 py-2.5 text-center font-semibold">TMA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhasPorTema.map((linha) => (
                            // Sem hover: a linha não tem ação ao clicar.
                            <tr key={linha.bucket} className="border-border/20 border-b last:border-0">
                              <td className="text-foreground ds-body max-w-[220px] truncate px-4 py-2.5 text-xs font-medium">
                                {linha.label}
                              </td>
                              <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                                {linha.qtd}
                              </td>
                              <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                                {linha.pct.toFixed(1)}%
                              </td>
                              <td className={`ds-mono-sm px-4 py-2.5 text-center text-xs font-semibold tabular-nums ${classeStatusTma(linha.status)}`}>
                                {formatKpiValue(linha.tma, "time")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Atendimentos ───────────────────────────────────── */}
              <div className="space-y-2">
                <TituloBloco>Atendimentos</TituloBloco>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="cabecalho-tabela">
                        <th className="px-4 py-2.5 text-center font-semibold">TMA</th>
                        <th className="px-4 py-2.5 font-semibold">Skill</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Cliente</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atendimentos.map((at, i) => (
                        <tr key={i} className="border-border/20 border-b last:border-0">
                          <td
                            className={`ds-mono-sm px-4 py-2.5 text-center text-xs font-semibold tabular-nums ${classeStatusTma(
                              statusTmaDe(at.duracaoSegundos, thresholdConfig),
                            )}`}
                          >
                            {formatKpiValue(at.duracaoSegundos, "time")}
                          </td>
                          <td className="text-foreground ds-body max-w-[280px] truncate px-4 py-2.5 text-xs font-medium">
                            {at.skill ?? "—"}
                          </td>
                          <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                            {at.telefoneCliente ?? "—"}
                          </td>
                          <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                            {at.hora ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
              )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
