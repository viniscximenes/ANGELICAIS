// Suspense fallback do Next.js pra /reports/tma-peso — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getGestorTma + outras 4 chamadas em paralelo, mais o piso mínimo de
// MIN_LOADING_MS — ver page.tsx) ainda não resolveu.
//
// Reescrito pra ESPELHAR EXATAMENTE o layout real (mesma técnica de
// /reports/consolidado/loading.tsx, lido por referência) — não o formato
// genérico compartilhado (antigo KpiLoadingScreen formato="tma-peso"): mesmo
// wrapper (`data-page`, `max-w-7xl`, paddings), mesmas classes literais de
// título/subtítulo/linha de botões (copiadas de gestor-tma-section.tsx),
// mesma largura de card da tabela (TABELA_LARGURA_PX de
// gestor-tma-section.tsx) dentro do MESMO componente KpiFrame (cantoneiras
// reais, sem duplicar o desenho), e mesma altura de gráfico (280px, ver
// evolucao-tma-chart.tsx). Isso evita o "pulo" de layout quando os dados
// chegam: todo bloco do skeleton ocupa a MESMA posição/tamanho que o
// elemento real vai ocupar.
//
// Exceção: a barra lateral flutuante de navegação (TmaNavSidebar) — é "use
// client" com estado próprio (hover expande) e os onClick fazem scroll até
// #trilho-card-N/#equipe-section, elementos que não existem durante o
// loading. Trocada por um placeholder mudo (SkeletonNavSidebar, abaixo) na
// MESMA posição/tamanho (fixed, top-24 right-4, 60px colapsado) — mesmo
// tratamento do Consolidado.
import { Instrument_Sans } from "next/font/google";

import "./reports-tma-peso.css";
import { DotSpinner } from "@/components/gestor/dot-spinner";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";

// MESMA fonte/variável de page.tsx (zenSans) — precisa ser importada aqui de
// novo (loading.tsx é o fallback, monta ANTES de page.tsx resolver), senão o
// título/subtítulo do skeleton renderizam com a fonte padrão do sistema e
// medem largura diferente da versão real, quebrando a promessa de "mesma
// posição exata".
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Largura real do card da tabela (TABELA_LARGURA_PX, gestor-tma-section.tsx):
// 760px de conteúdo + 26px de chrome do KpiFrame por dentro.
const TABELA_LARGURA_PX = 786;

// Grid da TmaTable (GRID_TEMPLATE_COLUMNS, tma-table.tsx): Operador : TMA :
// Qtd. Ligações, proporção 3:2:2 — em fr, preenche o card inteiro.
const TABLE_GRID_TEMPLATE = "3fr 2fr 2fr";
const TABLE_ROWS = 10;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha de botões — MESMAS classes/ordem/tamanhos de gestor-tma-section.tsx:
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

/** Tabela — dentro do MESMO KpiFrame real (cantoneiras verdadeiras, não
 * desenhadas de novo), header com as 3 colunas nas proporções reais e ~10
 * linhas de corpo (h-[42px], igual à altura real de cada linha). */
function SkeletonTabelaTma() {
  return (
    <KpiFrame className="h-full">
      <div className="overflow-hidden">
        <div
          className="grid gap-0 bg-muted/40"
          style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex h-9 items-center justify-center border-r border-border/40 px-3 last:border-r-0">
              <SkeletonBloco className="h-3 w-[60%] bg-muted-foreground/20" />
            </div>
          ))}
        </div>

        {Array.from({ length: TABLE_ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid h-[42px] gap-0 border-t border-border/40"
            style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
          >
            <div className="flex items-center justify-center border-r border-border/40 px-3">
              <SkeletonBloco className="h-3 w-[65%]" />
            </div>
            <div className="flex items-center justify-center border-r border-border/40 px-3">
              <SkeletonBloco className="h-3 w-10" />
            </div>
            <div className="flex items-center justify-center px-3">
              <SkeletonBloco className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}

/** Painel da direita (Anexar Base) — mesmas dimensões de TmaUploadDropzone
 * (min-h-[180px], flex-1, borda tracejada, sem texto/título acima). */
function SkeletonPainelAnexo() {
  return (
    <div className="min-h-[180px] min-w-0 flex-1 self-stretch">
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
        <SkeletonBloco className="h-8 w-8 rounded-full bg-muted-foreground/15" />
        <SkeletonBloco className="h-3 w-32 bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/** Cards Resumo (TMA + Atendidos) — MESMO grid/proporções de
 * CardsResumoTma.tsx (1 card primário col-span-2 + 1 secundário col-span-3,
 * sm:items-end). */
function SkeletonCardsResumo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      <div className="h-[128px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
      <div className="h-[92px] rounded-lg border border-border bg-card/70 sm:col-span-3" />
    </div>
  );
}

/** Evolução do TMA — título fora do card (real: sem container próprio,
 * StyledCard removido) + altura real do gráfico (280px, evolucao-tma-chart.tsx). */
function SkeletonEvolucao() {
  return (
    <div className="space-y-3">
      <div>
        <SkeletonBloco className="h-5 w-56" />
        <SkeletonBloco className="mt-2 h-3 w-[85%] max-w-md bg-card/70" />
      </div>
      <div className="h-[280px] w-full rounded-lg bg-card/60" />
    </div>
  );
}

/** Placeholder mudo da barra lateral flutuante (TmaNavSidebar) — mesma
 * casca visual (FloatingNavSidebar: fixed top-24 right-4, hidden abaixo de
 * lg, 60px colapsado, border-border/60 + rounded-xl + shadow-lg) com 7
 * círculos no lugar dos 7 ícones reais, sem nenhuma interatividade. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-tma-peso"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-3 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBloco key={i} className="h-5 w-5 rounded-full bg-muted-foreground/15" />
        ))}
      </div>
    </div>
  );
}

// Script inline, síncrono — roda no PARSE do HTML deste fallback, antes de
// qualquer hidratação React. A guarda em JS (useLayoutEffect, ver
// analitico-tma-section.tsx) só age DEPOIS que o bundle carrega e o
// componente monta; nesse intervalo (streaming do loading.tsx + piso
// mínimo de MIN_LOADING_MS em page.tsx), o navegador já pode ter restaurado
// e PINTADO a posição de scroll salva (ex.: fim da página) — daí o "pisca"
// reportado: um frame na posição antiga, só depois corrigido pra topo. Este
// script fecha essa janela, desligando a restauração nativa e forçando o
// topo o mais cedo possível (antes do primeiro paint do documento).
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingReportsTmaPeso() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <SkeletonNavSidebar />

      <div
        data-page="reports-tma-peso"
        className={`relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className={`mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none`}
        >
          <div className="space-y-10">
            {/* ── Bloco Equipe (título + subtítulo + botões + tabela/anexo) ── */}
            <div>
              <div className="pt-4">
                <SkeletonBloco className="h-9 w-[190px] md:h-10" />
                <div className="pt-3">
                  <SkeletonBloco className="h-3.5 w-[260px] bg-card/70" />
                </div>
              </div>

              <SkeletonBarraDeAcoes />

              <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
                <div className="shrink-0" style={{ width: `${TABELA_LARGURA_PX}px`, maxWidth: "100%" }}>
                  <SkeletonTabelaTma />
                </div>
                <SkeletonPainelAnexo />
              </div>
            </div>

            {/* ── Bloco Analítico (título + Cards Resumo + Evolução) ── */}
            <section>
              <header className="pt-2 pb-4 mb-6">
                <SkeletonBloco className="h-9 w-48 md:h-10" />
              </header>
              <div className="space-y-6">
                <SkeletonCardsResumo />
                <SkeletonEvolucao />
              </div>
            </section>
          </div>
        </div>

        {/* Indicador de carregamento — nítido, centralizado sobre a área da
            tabela, sem sobrepor o cabeçalho/botões acima dele. Mesmo
            dot-spinner do Consolidado, sem texto visível. */}
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-[33%] flex flex-col items-center gap-3 -translate-y-1/2"
        >
          <DotSpinner />
          <span className="sr-only">Carregando TMA &amp; Peso, aguarde.</span>
        </div>
      </div>
    </>
  );
}
