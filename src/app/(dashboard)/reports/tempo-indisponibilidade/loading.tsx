// Suspense fallback do Next.js pra /reports/tempo-indisponibilidade —
// mostrado automaticamente enquanto o Server Component de page.tsx (async,
// aguarda getGestorTempoLogado + getGestorIndisponibilidade + outras 3
// chamadas em paralelo, mais o piso mínimo de 3s de page.tsx) ainda não
// resolveu.
//
// Reescrito no MESMO formato do loading.tsx de /reports/consolidado (não
// mais o KpiLoadingScreen formato="tempo-indisponibilidade", compartilhado):
// mesmos blocos (SkeletonBloco, rounded-md + bg-card), mesma barra lateral
// muda, mesmo esqueleto de tabela dentro do KpiFrame real e mesmo painel de
// anexo — as formas batem com as do Consolidado. O layout segue a página
// real desta rota (tempo-indisp-section.tsx): título + subtítulo, 3 botões,
// anexo de largura cheia ACIMA da tabela, tabela de 8 colunas (larguras de
// COLUNAS em tempo-indisp-tabela.tsx) e o 1º slide do Analítico (4 cards de
// resumo + Tabela de pausas detalhadas), com o mesmo space-y-10 entre a
// tabela e o título "Analítico".
//
// O overlay de refresh manual (Limpar Base) continua com o KpiLoadingScreen,
// como no Consolidado.
import { Instrument_Sans } from "next/font/google";

import "./reports-tempo-indisp.css";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";

// MESMA fonte/variável de page.tsx (zenSans) — loading.tsx monta ANTES de
// page.tsx resolver; sem ela o skeleton mede com a fonte padrão do sistema.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Larguras reais das colunas da TempoIndispTabela (COLUNAS em
// tempo-indisp-tabela.tsx) — a última é minmax(170px, 1fr), como lá.
const TABLE_COLUMN_WIDTHS_PX = [200, 150, 110, 140, 120, 110, 190, 170] as const;
const TABLE_GRID_TEMPLATE = TABLE_COLUMN_WIDTHS_PX.map((w, i) =>
  i === TABLE_COLUMN_WIDTHS_PX.length - 1 ? `minmax(${w}px, 1fr)` : `${w}px`,
).join(" ");
const TABLE_ROWS = 13;
const PAUSAS_ROWS = 8;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha de botões — mesma ordem/tamanhos da página real:
 * [config] [limpar base] [copiar imagem], todos h-8 (sem toggle RV). */
function SkeletonBarraDeAcoes() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-[148px] shrink-0" />
    </div>
  );
}

/** Anexo — MESMO placeholder do Consolidado (SkeletonPainelAnexo), na altura
 * do dropzone desta rota (minHeight 140px, largura cheia). */
function SkeletonPainelAnexo() {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
      <SkeletonBloco className="h-8 w-8 rounded-full bg-muted-foreground/15" />
      <SkeletonBloco className="h-3 w-32 bg-muted-foreground/15" />
    </div>
  );
}

/** Tabela — dentro do MESMO KpiFrame real, header com as 8 colunas nas
 * larguras reais e 13 linhas de corpo (h-[44px], altura mínima real da linha). */
function SkeletonTabela() {
  return (
    <KpiFrame>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            <div
              className="grid gap-0 bg-muted/40"
              style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
            >
              {TABLE_COLUMN_WIDTHS_PX.map((_, i) => (
                <div key={i} className="flex h-9 items-center justify-center border-r border-border/40 px-3 last:border-r-0">
                  <SkeletonBloco className="h-3 w-[70%] bg-muted-foreground/20" />
                </div>
              ))}
            </div>

            {Array.from({ length: TABLE_ROWS }).map((_, row) => (
              <div
                key={row}
                className="grid h-[44px] gap-0 border-t border-border/40"
                style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
              >
                {/* Operador — bloco de texto maior, como o nome real. */}
                <div className="flex items-center justify-center border-r border-border/40 px-3">
                  <SkeletonBloco className="h-3 w-[75%]" />
                </div>
                {TABLE_COLUMN_WIDTHS_PX.slice(1).map((_, col) => (
                  <div key={col} className="flex items-center justify-center border-r border-border/40 px-3 last:border-r-0">
                    <SkeletonBloco className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </KpiFrame>
  );
}

/** 4 cards de resumo — MESMO grid de CardsResumoAnalitico (sm:grid-cols-6,
 * 2 grandes col-span-2 + 2 pequenos col-span-1, sm:items-end) e as mesmas
 * alturas dos cards da Visão Geral no skeleton do Consolidado. */
function SkeletonCardsResumo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-end">
      <div className="h-[118px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
      <div className="h-[118px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
      <div className="h-[86px] rounded-lg border border-border bg-card/70" />
      <div className="h-[86px] rounded-lg border border-border bg-card/70" />
    </div>
  );
}

/** Tabela de pausas detalhadas — título + subtítulo fora da tabela (como o
 * "Evolução" no skeleton do Consolidado) + cabeçalho e linhas sem divisórias
 * verticais, como a tabela real. */
function SkeletonPausasDetalhadas() {
  return (
    <div className="space-y-3">
      <div>
        <SkeletonBloco className="h-5 w-64" />
        <SkeletonBloco className="mt-2 h-3 w-[85%] max-w-md bg-card/70" />
      </div>
      <div className="overflow-hidden">
        <div className="h-11 bg-muted/40" />
        {Array.from({ length: PAUSAS_ROWS }).map((_, i) => (
          <div key={i} className="h-10 border-t border-border/30" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder mudo da barra lateral flutuante (TempoIndispNavSidebar) —
 * MESMA casca do skeleton do Consolidado, com 5 marcadores no lugar dos 5
 * ícones reais, sem nenhuma interatividade. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-tempo-indisponibilidade"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-3 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBloco key={i} className="h-5 w-5 rounded-full bg-muted-foreground/15" />
        ))}
      </div>
    </div>
  );
}

// Script inline, síncrono — roda no PARSE do HTML deste fallback, antes de
// qualquer hidratação React. A guarda em JS (useLayoutEffect, ver
// TempoIndispSection) só age DEPOIS que o bundle carrega e o componente
// monta; nesse intervalo (streaming deste loading.tsx + piso mínimo de 3s
// em page.tsx), o navegador já pode ter restaurado e PINTADO a posição de
// scroll salva (ex.: fim da página) — daí um "pisca" possível: um frame na
// posição antiga, só depois corrigido pra topo. Este script fecha essa
// janela, desligando a restauração nativa e forçando o topo o mais cedo
// possível (antes do primeiro paint do documento). Mesma correção
// replicada em /reports/consolidado e /reports/tma-peso.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingReportsTempoIndisponibilidade() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <TempoIndispSkeleton />
    </>
  );
}

/**
 * Esqueleto do F5 (sem o script de scroll) — exportado pra ser reaproveitado
 * TAMBÉM no overlay de refresh manual do "Limpar base" (TempoIndispSection),
 * que antes usava o KpiLoadingScreen antigo — mesmo ajuste do Consolidado
 * (ConsolidadoSkeleton). As duas telas de carregamento ficam idênticas.
 */
export function TempoIndispSkeleton() {
  return (
    <>
      <SkeletonNavSidebar />

      {/* tempo-indisp-skeleton: tom dos blocos (reports-tempo-indisp.css) —
          bg-card sozinho é branco puro na Vercel clara e os blocos sumiam. */}
      <div
        data-page="reports-tempo-indisponibilidade"
        className={`tempo-indisp-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          {/* ── Cabeçalho (título + subtítulo + botões) ── */}
          <div className="pt-4">
            <SkeletonBloco className="h-9 w-[560px] max-w-full md:h-10" />
            <div className="pt-3">
              <SkeletonBloco className="h-3.5 w-[235px] bg-card/70" />
            </div>
          </div>

          <SkeletonBarraDeAcoes />

          {/* ── Anexo + tabela + Analítico (mesma estrutura da seção real) ── */}
          <div className="flex flex-col gap-4 pt-2">
            <SkeletonPainelAnexo />

            <div className="space-y-10">
              <SkeletonTabela />

              <section>
                <header className="pt-2 pb-4 mb-6">
                  <SkeletonBloco className="h-9 w-48 md:h-10" />
                </header>
                <div className="flex flex-col gap-6">
                  <SkeletonCardsResumo />
                  <SkeletonPausasDetalhadas />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Sem indicador girando (igual ao Consolidado): o carregamento é só
            o skeleton. Fica apenas o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Tempo Logado &amp; Indisponibilidade, aguarde.
        </div>
      </div>
    </>
  );
}
