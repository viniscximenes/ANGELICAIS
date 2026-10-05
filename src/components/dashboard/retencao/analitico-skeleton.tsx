import type { ReactNode } from "react";

/**
 * Esqueletos do bloco Analítico de /s/reports/consolidado — usados no
 * carregamento client-side da seção (RetencaoDetalheSection) e TAMBÉM no
 * loading.tsx da rota (F5), pra as duas telas de espera desenharem o mesmo
 * bloco do mesmo jeito (sem pulo de layout).
 * Sem "use client": não tem estado, então o loading.tsx (server) importa
 * sem puxar o bundle pesado da seção (GSAP etc.).
 */

/** Alturas (%) das barras do skeleton — fixas pra não mudar a cada render. */
const SKELETON_BARRAS = [18, 42, 55, 70, 78, 64, 72, 50, 58, 74, 80, 46, 28, 12];

/**
 * Tom dos blocos do skeleton: o mesmo cinza das barras do gráfico
 * (--muted-foreground a 14%). bg-card não serve aqui — na Vercel clara é
 * branco puro sobre fundo quase branco, os blocos sumiam.
 */
const SKELETON_BLOCO = "bg-[color-mix(in_oklab,var(--muted-foreground)_14%,transparent)]";

/**
 * Skeleton do bloco "Evolução da equipe" (título, descrição, legenda e
 * gráfico). Mesmas alturas do bloco real (gráfico = 380px, ver
 * evolucao-equipe.tsx) pra não pular o layout.
 */
export function EvolucaoSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando gráfico">
      <div className="min-w-0 skeleton-pulso space-y-2 motion-reduce:animate-none">
        <div className={`${SKELETON_BLOCO} h-6 w-44 rounded-md`} />
        <div className={`${SKELETON_BLOCO} h-4 w-full max-w-[520px] rounded-md`} />
      </div>
      <div className="flex skeleton-pulso flex-wrap gap-x-5 gap-y-1.5 motion-reduce:animate-none">
        {[64, 64, 76, 96, 72].map((w, i) => (
          <div key={i} className={`${SKELETON_BLOCO} h-3.5 rounded`} style={{ width: w }} />
        ))}
      </div>
      <div className="flex h-[380px] skeleton-pulso items-end gap-2 px-8 pb-6 motion-reduce:animate-none">
        {SKELETON_BARRAS.map((h, i) => (
          <div key={i} className={`${SKELETON_BLOCO} flex-1 rounded-t-[4px]`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton do carregamento inicial do Analítico: cards da visão geral (Taxa
 * de Retenção grande + Pedidos/Retidos/Churn) com o mesmo grid e caixas do
 * VisaoGeralCards, e o EvolucaoSkeleton embaixo.
 */
export function AnaliticoSkeleton() {
  const caixa = "rounded-lg border border-border bg-card/70 shadow-[var(--shadow-sm)]";
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando dados analíticos">
      {/* data-visao-geral-cards: mesmo relevo dos cards reais
          (reports-consolidado.css), pra não trocar de visual ao carregar. */}
      <div data-visao-geral-cards className="grid skeleton-pulso grid-cols-1 gap-4 motion-reduce:animate-none sm:grid-cols-5 sm:items-end">
        <div className={`${caixa} flex flex-col gap-3 p-6 sm:col-span-2`}>
          <div className={`${SKELETON_BLOCO} h-3.5 w-36 rounded`} />
          <div className={`${SKELETON_BLOCO} h-12 w-40 rounded-md`} />
        </div>
        <div className="grid grid-cols-3 gap-4 sm:col-span-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${caixa} flex flex-col gap-3 p-4`}>
              <div className={`${SKELETON_BLOCO} h-3.5 w-16 rounded`} />
              <div className={`${SKELETON_BLOCO} h-8 w-14 rounded-md`} />
            </div>
          ))}
        </div>
      </div>
      <EvolucaoSkeleton />
    </div>
  );
}

/** Barras do gráfico vazio — mesmo desenho do esqueleto, mais esmaecidas. */
const VAZIO_BARRAS = [22, 38, 54, 66, 72, 60, 68, 48, 56, 70, 76, 44, 30, 16];

/**
 * Estado vazio no formato de um gráfico esqueleto PARADO (sem pulso — não
 * está carregando, só não tem dado): barras e linha da meta bem esmaecidas
 * ocupando a largura, sem container em volta, com a mensagem por cima, no
 * centro. Usado quando o Analítico não tem atendimentos, no erro do
 * Analítico (com botão "Tentar novamente" em `acao`) e no gráfico de
 * evolução sem atendimentos com horário (equipe e dialog do operador).
 */
export function GraficoVazio({
  titulo,
  descricao,
  altura = 320,
  erro = false,
  acao,
}: {
  titulo: string;
  descricao: string;
  altura?: number;
  /** Descrição na cor de erro (--danger). */
  erro?: boolean;
  /** Botão/ação abaixo do texto (ex.: "Tentar novamente"). */
  acao?: ReactNode;
}) {
  return (
    <div className="relative w-full" style={{ height: altura }} role={erro ? "alert" : "status"}>
      <div aria-hidden="true" className="absolute inset-0 flex items-end gap-2 px-8 pb-6">
        {VAZIO_BARRAS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[4px] bg-[color-mix(in_oklab,var(--muted-foreground)_9%,transparent)]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      {/* Linha da meta, tracejada, no terço de cima. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-[30%] border-t border-dashed"
        style={{ borderColor: "color-mix(in oklab, var(--muted-foreground) 25%, transparent)" }}
      />
      {/* Esmaece as barras sob o texto, pra mensagem ler bem. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 45% 55% at 50% 50%, var(--background) 35%, transparent 100%)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
        <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
        <p
          className="ds-body text-muted-foreground max-w-sm text-sm"
          style={erro ? { color: "var(--danger)" } : undefined}
        >
          {descricao}
        </p>
        {acao && <div className="pt-2.5">{acao}</div>}
      </div>
    </div>
  );
}
