"use client";

import { useRef } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { StyledCard } from "@/components/gestor/styled-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import {
  bucketDaSkill,
  SKILL_BUCKET_LABELS,
  SKILL_BUCKET_ORDER,
  type SkillBucket,
} from "@/lib/tma/skills-retencao";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { calcularEvolucaoTmaPorHora, type TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { resolverTokenCss } from "@/lib/utils/resolver-token-css";
import { useSkillColors } from "./use-skill-colors";
import { TmaPorTemaOperadorMini } from "./tma-por-tema-operador-mini";
import type { TmaLinha } from "./tma-table";

interface TmaDetalheDialogProps {
  operador: TmaLinha | null;
  atendimentos: AtendimentoTma[];
  /** Threshold/direção efetivos do TMA (getTmaThresholdConfig) — MESMO usado na tabela principal e no Analítico, pra referência de meta no gráfico "TMA por Hora" deste operador. */
  thresholdConfig: TmaThresholdConfig;
  onOpenChange: (open: boolean) => void;
}

export function TmaDetalheDialog({ operador, atendimentos, thresholdConfig, onOpenChange }: TmaDetalheDialogProps) {
  const cores = useSkillColors();
  const pngRef = useRef<HTMLDivElement>(null);

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
  const donutData = SKILL_BUCKET_ORDER.filter((b) => (qtdPorBucket.get(b) ?? 0) > 0).map((bucket) => ({
    bucket,
    label: SKILL_BUCKET_LABELS[bucket],
    qtd: qtdPorBucket.get(bucket) ?? 0,
    pct: total > 0 ? ((qtdPorBucket.get(bucket) ?? 0) / total) * 100 : 0,
  }));

  // TMA médio POR BUCKET deste operador — métrica NOVA (não existe
  // precedente no Consolidado, ver investigação da rodada anterior), pro
  // card TmaPorTemaOperadorMini ao lado do donut. Bucket sem nenhum
  // atendimento do operador: null (renderizado como "—" pelo componente).
  const tmaPorBucket = Object.fromEntries(
    SKILL_BUCKET_ORDER.map((bucket) => {
      const soma = somaPorBucket.get(bucket);
      const qtd = qtdPorBucket.get(bucket);
      return [bucket, soma !== undefined && qtd ? soma / qtd : null];
    }),
  ) as Record<SkillBucket, number | null>;

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
  // uma ponta do segmento. Cores INVERTIDAS em relação ao Consolidado: lá é
  // retenção (higher_better — abaixo da meta é ruim/vermelho), aqui é TMA
  // (lower_better — abaixo da meta é bom/verde). Cores via resolverTokenCss
  // (valor COMPUTADO, não a string "var()" crua): o export em PNG clona
  // este SVG num <img> isolado, onde var() não resolve sem acesso ao :root
  // da página.
  const corAbaixoMeta = resolverTokenCss("--success", "#16a34a");
  const corAcimaMeta = resolverTokenCss("--danger", "#dc2626");
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
    indicesComDado.forEach((idx) => {
      const abaixo = evolucaoPorHora[idx].tmaMedioSegundos! < threshold;
      stopsGradiente.push({ offset: offsetDoIndice(idx), cor: abaixo ? corAbaixoMeta : corAcimaMeta });
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
      const inicioAbaixo = valorInicial < threshold;
      const fimAbaixo = valorFinal < threshold;
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

  // Título do modal: e-mail LITERAL (parte local, minúsculo, sem
  // formatação) — exceção deliberada à convenção geral do site (nome
  // fantasia sempre), na mesma família de exceções já documentadas neste
  // modal (nome REAL em vez de nomeExibicao). Diferença desta rodada: antes
  // mostrava "Nome Sobrenome" (formatNomeProprio + deriveNomeOperador),
  // agora é o e-mail cru (ex.: "vitoria.dsantos") — pedido explícito do
  // usuário. Vale pro PNG exportado também (nome do arquivo abaixo). Não
  // trocar de volta numa manutenção futura sem confirmar com o usuário.
  const emailLocal = operador ? (operador.operatorEmail.split("@")[0] ?? operador.operatorEmail).toLowerCase() : "";

  return (
    <Dialog open={operador !== null} onOpenChange={onOpenChange}>
      {/*
        Paridade de borda/largura com OperadorDetalheDialog do Consolidado
        (dashboard/retencao/operador-detalhe-dialog.tsx, lido por referência,
        NÃO editado): sm:max-w-4xl (era sm:max-w-[960px]) + mesma
        border-border/80 já usada.
      */}
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-4xl bg-background border-border/80 p-6 shadow-2xl">
        {operador && (
          <>
            <ExportPopupPngButton
              contentRef={pngRef}
              filename={`tma_${emailLocal}.png`}
              className="absolute top-2 right-10"
            />

            {/*
              Sem template separado: o PNG captura este mesmo wrapper (via
              pngRef), com background explícito porque o fundo do
              DialogContent fica no ancestral, fora do que é capturado —
              assim a imagem sempre reflete o tema atual (claro/escuro), não
              um tema fixo.
            */}
            <div ref={pngRef} style={{ backgroundColor: "var(--background)" }}>
              <DialogHeader className="border-b border-dashed border-border/60 pb-3 space-y-1.5">
                <DialogTitle className="ds-h3 font-semibold tracking-tight text-xl">{emailLocal}</DialogTitle>
              </DialogHeader>

              {/*
                Cards do topo — MESMO padrão visual do Consolidado
                (StyledCard + withGradient + corners), mas só 2 cards
                (TMA/Atendimentos, os únicos que fazem sentido pra TMA — sem
                os 4 de retenção do Consolidado) — por isso corners
                "left"/"right" direto, sem o "none" do meio que só existe
                quando há 4 cards.
              */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <StyledCard className="px-4 py-3.5 flex flex-col justify-center" withGradient corners="left">
                  <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                    TMA
                  </p>
                  <p className="ds-display text-2xl font-semibold tabular-nums text-foreground">
                    {formatKpiValue(operador.tmaSegundos, "time")}
                  </p>
                </StyledCard>
                <StyledCard className="px-4 py-3.5 flex flex-col justify-center" withGradient corners="right">
                  <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                    Atendimentos
                  </p>
                  <p className="ds-display text-2xl font-semibold tabular-nums text-foreground">
                    {operador.qtdAtendimentos}
                  </p>
                </StyledCard>
              </div>

              {/* ── TMA por Hora ───────────────────────────────────── */}
              <div className="space-y-2 pt-4">
                <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  TMA por Hora
                </h4>
                <StyledCard className="p-4" withGradient>
                  <div className="w-full h-[220px]">
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
                              </div>
                            );
                          }}
                        />

                        <Bar yAxisId="right" dataKey="total" barSize={24} radius={[4, 4, 0, 0]} animationDuration={300} animationEasing="ease-out">
                          {evolucaoPorHora.map((entry, index) => {
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

                        {/*
                          Linha RETA (type="linear", segmentos retos entre
                          buckets — pedido explícito, não curva suave), com
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
                            const dotColor =
                              payload.status === "danger" ? "var(--danger)" : payload.status === "success" ? "var(--success)" : "var(--foreground)";
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
                            const dotColor =
                              payload.status === "danger" ? "var(--danger)" : payload.status === "success" ? "var(--success)" : "var(--foreground)";
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
                </StyledCard>
              </div>

              {/* ── Distribuição por tema (donut) + TMA por Tema (novo) ── */}
              <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                <StyledCard className="p-4" withGradient>
                  {donutData.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              dataKey="qtd"
                              nameKey="label"
                              innerRadius="55%"
                              outerRadius="80%"
                              paddingAngle={2}
                              isAnimationActive
                            >
                              {donutData.map((entry) => (
                                <Cell
                                  key={entry.bucket}
                                  fill={cores[entry.bucket]}
                                  stroke={cores.surface}
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "var(--popover)",
                                border: "1px solid var(--border)",
                                fontSize: 12,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex flex-col gap-2">
                        {donutData.map((entry) => (
                          <div key={entry.bucket} className="flex items-center gap-2 text-sm">
                            <span
                              aria-hidden="true"
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: cores[entry.bucket] }}
                            />
                            <span className="truncate">{entry.label}</span>
                            <span className="ds-mono-sm font-semibold">{entry.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                      Nenhum atendimento registrado para este operador no dia.
                    </p>
                  )}
                </StyledCard>

                <TmaPorTemaOperadorMini tmaPorBucket={tmaPorBucket} cores={cores} />
              </div>

              <div className="overflow-x-auto pt-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-dashed border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-normal">TMA</th>
                      <th className="py-2 pr-4 font-normal">Skill</th>
                      <th className="py-2 pr-4 font-normal">Telefone do cliente</th>
                      <th className="py-2 pr-4 font-normal">Hora do atendimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atendimentos.map((at, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2 pr-4 ds-mono-sm">
                          {formatKpiValue(at.duracaoSegundos, "time")}
                        </td>
                        <td className="py-2 pr-4">{at.skill ?? "—"}</td>
                        <td className="py-2 pr-4 ds-mono-sm">{at.telefoneCliente ?? "—"}</td>
                        <td className="py-2 pr-4 ds-mono-sm">{at.hora ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
