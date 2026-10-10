"use client";

import { useRef } from "react";

import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import {
  bucketDaSkill,
  SKILL_BUCKET_LABELS,
  SKILL_BUCKET_ORDER,
  type SkillBucket,
} from "@/lib/tma/skills-retencao";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { classeStatusTma } from "@/lib/tma/format-tma";
import { calcularEvolucaoTmaPorHora, type TmaHoraData } from "@/lib/tma/get-gestor-tma-evolucao-hora";
import { statusTmaDe, type TmaThresholdConfig } from "@/lib/tma/tma-status-pure";
import { EvolucaoTmaChart } from "./evolucao-tma-chart";
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
  /** Atendimentos do operador — já carregados: TmaTable só abre o modal depois da busca. */
  atendimentos: AtendimentoTma[];
  /** Threshold/direção efetivos do TMA (getTmaThresholdConfig) — MESMO usado na tabela principal e no Analítico, pra referência de meta no gráfico "TMA por Hora" deste operador. */
  thresholdConfig: TmaThresholdConfig;
  onOpenChange: (open: boolean) => void;
}

export function TmaDetalheDialog({
  operador,
  atendimentos,
  thresholdConfig,
  onOpenChange,
}: TmaDetalheDialogProps) {
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

              {/* ── Evolução por hora ──────────────────────────────── */}
              <div className="space-y-2">
                <TituloBloco>Evolução por hora</TituloBloco>
                {/* Mesmo gráfico do "Evolução da equipe" do Analítico (que segue
                    o EvolucaoEquipe do Consolidado), menor e sem a lista de
                    operadores — o modal do Consolidado faz o mesmo. */}
                <EvolucaoTmaChart
                  dados={evolucaoPorHora}
                  thresholdConfig={thresholdConfig}
                  altura={300}
                  mostrarOperadores={false}
                />
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
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
