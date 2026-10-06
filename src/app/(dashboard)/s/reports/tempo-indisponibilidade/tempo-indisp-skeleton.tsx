// Esqueleto de /s/reports/tempo-indisponibilidade — espelha o layout real
// (mesmo wrapper, classes de título/subtítulo/botões, anexo acima da
// tabela, larguras de coluna da TempoIndispTabela, KpiFrame real, alturas
// medidas das classes reais), pra não haver "pulo" quando os dados chegam.
// Usado pelo loading.tsx e pelo overlay do "Limpar base"
// (TempoIndispSection). Mesmo formato do esqueleto do Consolidado.
//
// A barra lateral é um placeholder mudo (SkeletonNavSidebar) — a real é
// interativa e faz scroll até elementos que ainda não existem no loading.

import "./reports-tempo-indisp.css";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { FonteInter } from "@/components/gestor/fonte-inter";

// Larguras reais das colunas da TempoIndispTabela (COLUNAS em
// tempo-indisp-tabela.tsx) — a última é minmax(170px, 1fr), como lá.
const TABLE_COLUMN_WIDTHS_PX = [200, 150, 110, 140, 120, 110, 190, 170] as const;
const TABLE_GRID_TEMPLATE = TABLE_COLUMN_WIDTHS_PX.map((w, i) =>
  i === TABLE_COLUMN_WIDTHS_PX.length - 1 ? `minmax(${w}px, 1fr)` : `${w}px`,
).join(" ");
// Nº de linhas quando não se sabe o tamanho da equipe (1º acesso neste
// navegador). Depois disso vem do cookie COOKIE_LINHAS.
const TABLE_ROWS_PADRAO = 13;
const PAUSAS_ROWS = 8;

/**
 * Cookie com o nº de operadores da última tabela exibida neste navegador —
 * gravado por TempoIndispSection, lido pelo loading.tsx (server) pra o
 * esqueleto ter a altura da tabela real.
 */
export const COOKIE_LINHAS = "tempo_indisp_linhas";

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha de botões — mesma ordem/tamanhos da página real:
 * [config] [limpar base] [copiar imagem], todos h-8. */
function SkeletonBarraDeAcoes() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-[148px] shrink-0" />
    </div>
  );
}

/** Anexo — largura cheia acima da tabela, altura do dropzone desta rota
 * (minHeight 140px), com a pasta central (≈68×60px). */
function SkeletonPainelAnexo() {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-6">
      <SkeletonBloco className="h-[60px] w-[68px] rounded-lg bg-muted-foreground/15" />
    </div>
  );
}

/** Tabela — dentro do MESMO KpiFrame real. Alturas das classes reais
 * (tempo-indisp-tabela.tsx / tabela-padrao.tsx): cabeçalho = py-2.5 +
 * linha de 21px + borda; linha de operador = 44px (altura mínima), sem
 * borda entre linhas (só divisórias de coluna). */
function SkeletonTabela({ linhas }: { linhas: number }) {
  return (
    <KpiFrame>
      <div className="overflow-hidden">
        <div className="min-w-fit">
          <div
            className="grid gap-0 border-b border-border bg-muted/40"
            style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
          >
            {TABLE_COLUMN_WIDTHS_PX.map((_, i) => (
              <div key={i} className="flex h-[41px] items-center justify-center border-r border-border/50 px-3 last:border-r-0">
                <SkeletonBloco className="h-3 w-[70%] bg-muted-foreground/20" />
              </div>
            ))}
          </div>

          {Array.from({ length: linhas }).map((_, row) => (
            <div
              key={row}
              className="grid h-[44px] gap-0"
              style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
            >
              <div className="flex items-center justify-center border-r border-border/30 px-3">
                <SkeletonBloco className="h-3 w-[55%]" />
              </div>
              {TABLE_COLUMN_WIDTHS_PX.slice(1).map((_, col) => (
                <div key={col} className="flex items-center justify-center border-r border-border/30 px-3 last:border-r-0">
                  <SkeletonBloco className="h-3 w-12" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </KpiFrame>
  );
}

/** 4 cards de resumo — MESMO grid de CardsResumoAnalitico (sm:grid-cols-6,
 * 2 grandes col-span-2 + 2 pequenos, sm:items-end) e mesmas alturas.
 * data-visao-geral-cards: mesmo relevo dos cards reais (globals.css). */
function SkeletonCardsResumo() {
  const caixa = "rounded-lg border border-border bg-card/70 shadow-[var(--shadow-sm)]";
  return (
    <div data-visao-geral-cards className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-end">
      <div className={`${caixa} h-[118px] sm:col-span-2`} />
      <div className={`${caixa} h-[118px] sm:col-span-2`} />
      <div className={`${caixa} h-[86px]`} />
      <div className={`${caixa} h-[86px]`} />
    </div>
  );
}

/** Tabela de pausas detalhadas — título + descrição + cabeçalho e linhas
 * sem divisórias verticais, como a tabela real (linha = py-3 + 16px + borda). */
function SkeletonPausasDetalhadas() {
  return (
    <div className="space-y-3">
      <div>
        <SkeletonBloco className="h-5 w-64" />
        <SkeletonBloco className="mt-2 h-3 w-[85%] max-w-md bg-card/70" />
      </div>
      <div className="overflow-hidden">
        <div className="h-[42px] border-b border-border bg-muted/40" />
        {Array.from({ length: PAUSAS_ROWS }).map((_, i) => (
          <div key={i} className="h-[41px] border-b border-border/30" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder mudo da barra lateral (TempoIndispNavSidebar) — mesma casca
 * do esqueleto do Consolidado, com 5 marcadores e a divisória após o 1º. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-tempo-indisponibilidade"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-1 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="contents">
            <div className="py-2">
              <SkeletonBloco className="h-5 w-5 rounded-md bg-muted-foreground/15" />
            </div>
            {i === 0 && <div className="bg-border my-1 h-px w-7" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Esqueleto da página — usado pelo loading.tsx (F5) e pelo overlay de
 * refresh manual do "Limpar base" (TempoIndispSection): as duas telas de
 * carregamento ficam idênticas. Arquivo próprio (não dentro do loading.tsx)
 * porque o loading lê cookie no servidor e TempoIndispSection é client.
 */
export function TempoIndispSkeleton({ linhas = TABLE_ROWS_PADRAO }: { linhas?: number }) {
  return (
    <>
      <FonteInter dataPage="reports-tempo-indisponibilidade" toastClass="toast-padrao" />
      <SkeletonNavSidebar />

      {/* skeleton-tom: tom dos blocos (globals.css) — bg-card sozinho é
          branco puro na Vercel clara e os blocos sumiam. */}
      <div
        data-page="reports-tempo-indisponibilidade"
        className="skeleton-tom pagina-padrao relative min-h-screen px-6 py-8 lg:px-12 lg:py-12"
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          <div className="space-y-10">
            {/* ── Título + subtítulo + botões + anexo + tabela ── */}
            <div className="space-y-4 skeleton-pulso">
              <div>
                <div className="pt-4">
                  <SkeletonBloco className="h-9 w-[560px] max-w-full md:h-10" />
                  {/* h-5 = altura da linha real do subtítulo (text-sm, 20px). */}
                  <div className="flex h-5 items-center pt-3 box-content">
                    <SkeletonBloco className="h-3.5 w-[235px] max-w-full bg-card/70" />
                  </div>
                </div>

                <SkeletonBarraDeAcoes />

                <div className="flex flex-col gap-4 pt-2">
                  <SkeletonPainelAnexo />
                  <SkeletonTabela linhas={linhas} />
                </div>
              </div>
            </div>

            {/* ── Analítico (título + 1º slide do trilho) ── */}
            <section>
              <header className="pt-2 pb-4 mb-6 flex items-center gap-4">
                <SkeletonBloco className="h-8 w-40 shrink-0 skeleton-pulso md:h-9" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="block h-0.5 w-24 bg-muted-foreground/55" />
                  <span className="block h-0.5 w-full bg-muted-foreground/55" />
                </div>
              </header>
              <div className="flex flex-col gap-6 skeleton-pulso">
                <SkeletonCardsResumo />
                <SkeletonPausasDetalhadas />
              </div>
            </section>
          </div>
        </div>

        {/* Sem indicador girando: o carregamento é só o esqueleto. Fica
            apenas o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Tempo Logado &amp; Indisponibilidade, aguarde.
        </div>
      </div>
    </>
  );
}
