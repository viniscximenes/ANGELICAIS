// Esqueleto de /s/reports/tma-peso — espelha o layout real (mesmo wrapper,
// classes de título/subtítulo/botões, tabela no KpiFrame real ao lado do
// anexo, alturas medidas das classes reais), pra não haver "pulo" quando os
// dados chegam. Usado pelo loading.tsx e pelo overlay do "Limpar base"
// (GestorTmaSection). Mesmo formato do esqueleto do Consolidado.
//
// A barra lateral é um placeholder mudo (SkeletonNavSidebar) — a real é
// interativa e faz scroll até elementos que ainda não existem no loading.

import "./reports-tma-peso.css";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { EvolucaoSkeleton } from "@/components/dashboard/retencao/analitico-skeleton";
import { FonteInter } from "@/components/gestor/fonte-inter";

/** Largura da coluna da tabela: 760px de conteúdo + p-3 do KpiFrame (2 × 12px). */
export const TMA_TABELA_LARGURA_PX = 784;

// Grid da TmaTable (Operador : TMA : Qtd. Ligações, 3:2:2).
const TABLE_GRID_TEMPLATE = "3fr 2fr 2fr";
// Nº de linhas quando não se sabe o tamanho da equipe (1º acesso neste
// navegador). Depois disso vem do cookie COOKIE_LINHAS.
const TABLE_ROWS_PADRAO = 20;

/**
 * Cookie com o nº de operadores da última tabela exibida neste navegador —
 * gravado por GestorTmaSection, lido pelo loading.tsx (server) pra o
 * esqueleto ter a altura da tabela real (e o anexo ao lado, que estica junto).
 */
export const COOKIE_LINHAS = "tma_peso_linhas";

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

/** Tabela — dentro do MESMO KpiFrame real. Alturas das classes reais
 * (tabela-padrao.tsx): cabeçalho = py-2.5 + linha de 21px + borda; linha de
 * operador = py-2 + 21px = 37px, sem borda entre linhas (só divisórias de
 * coluna). */
function SkeletonTabelaTma({ linhas }: { linhas: number }) {
  return (
    <KpiFrame className="h-full">
      <div className="overflow-hidden">
        <div
          className="grid gap-0 border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-[41px] items-center justify-center border-r border-border/50 px-3 last:border-r-0">
              <SkeletonBloco className="h-3 w-[60%] bg-muted-foreground/20" />
            </div>
          ))}
        </div>

        {Array.from({ length: linhas }).map((_, row) => (
          <div key={row} className="grid h-[37px] gap-0" style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}>
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-[55%]" />
            </div>
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-10" />
            </div>
            <div className="flex items-center justify-center px-3">
              <SkeletonBloco className="h-3 w-6" />
            </div>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}

/** Painel da direita (Anexar Base) — mesmas dimensões do TmaUploadDropzone
 * (min-h-[180px], flex-1, borda tracejada), com a pasta central. */
function SkeletonPainelAnexo() {
  return (
    <div className="min-h-[180px] min-w-0 flex-1 self-stretch">
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-6">
        <SkeletonBloco className="h-[60px] w-[68px] rounded-lg bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/** Cards de resumo (TMA + Atendidos) — MESMO grid de CardsResumoTma
 * (col-span-2 + col-span-3, sm:items-end) e mesmas alturas.
 * data-visao-geral-cards: mesmo relevo dos cards reais (globals.css). */
function SkeletonCardsResumo() {
  const caixa = "rounded-lg border border-border bg-card/70 shadow-[var(--shadow-sm)]";
  return (
    <div data-visao-geral-cards className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      <div className={`${caixa} h-[128px] sm:col-span-2`} />
      <div className={`${caixa} h-[92px] sm:col-span-3`} />
    </div>
  );
}

/** Placeholder mudo da barra lateral (TmaNavSidebar) — mesma casca do
 * esqueleto do Consolidado, com 7 marcadores e a divisória após o 1º. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-tma-peso"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-1 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 7 }).map((_, i) => (
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
 * refresh manual do "Limpar base" (GestorTmaSection): as duas telas de
 * carregamento ficam idênticas. Arquivo próprio (não dentro do loading.tsx)
 * porque o loading lê cookie no servidor e GestorTmaSection é client.
 */
export function TmaPesoSkeleton({ linhas = TABLE_ROWS_PADRAO }: { linhas?: number }) {
  return (
    <>
      <FonteInter dataPage="reports-tma-peso" toastClass="toast-padrao" />
      <SkeletonNavSidebar />

      {/* skeleton-tom: tom dos blocos (globals.css) — bg-card sozinho é
          branco puro na Vercel clara e os blocos sumiam. */}
      <div
        data-page="reports-tma-peso"
        className="skeleton-tom pagina-padrao relative min-h-screen px-6 py-8 lg:px-12 lg:py-12"
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          <div className="space-y-10">
            {/* ── Título + subtítulo + botões + tabela/anexo ── */}
            <div className="space-y-4 skeleton-pulso">
              <div>
                <div className="pt-4">
                  <SkeletonBloco className="h-9 w-[190px] md:h-10" />
                  {/* h-5 = altura da linha real do subtítulo (text-sm, 20px). */}
                  <div className="flex h-5 items-center pt-3 box-content">
                    <SkeletonBloco className="h-3.5 w-[260px] max-w-full bg-card/70" />
                  </div>
                </div>

                <SkeletonBarraDeAcoes />

                <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
                  <div className="shrink-0" style={{ width: `${TMA_TABELA_LARGURA_PX}px`, maxWidth: "100%" }}>
                    <SkeletonTabelaTma linhas={linhas} />
                  </div>
                  <SkeletonPainelAnexo />
                </div>
              </div>
            </div>

            {/* ── Analítico (título + cards + Evolução da equipe) ── */}
            <section>
              <header className="pt-2 pb-4 mb-6 flex items-center gap-4">
                <SkeletonBloco className="h-8 w-40 shrink-0 skeleton-pulso md:h-9" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="block h-0.5 w-24 bg-muted-foreground/55" />
                  <span className="block h-0.5 w-full bg-muted-foreground/55" />
                </div>
              </header>
              <div className="flex flex-col gap-6">
                <div className="skeleton-pulso">
                  <SkeletonCardsResumo />
                </div>
                <EvolucaoSkeleton />
              </div>
            </section>
          </div>
        </div>

        {/* Sem indicador girando: o carregamento é só o esqueleto. Fica
            apenas o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando TMA &amp; Peso, aguarde.
        </div>
      </div>
    </>
  );
}
