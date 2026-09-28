// Suspense fallback do Next.js pra /reports/consolidado — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getGestorConsolidado + outras 4 chamadas em paralelo, mais o piso mínimo
// de MIN_LOADING_MS — ver page.tsx) ainda não resolveu.
//
// Reescrito pra ESPELHAR EXATAMENTE o layout real (não um formato genérico
// compartilhado, tipo o antigo KpiLoadingScreen formato="consolidado"): mesmo
// wrapper (`data-page`, `max-w-7xl`, paddings), mesmas classes literais de
// título/subtítulo/linha de botões (copiadas de gestor-equipe-section.tsx),
// mesma largura de coluna da tabela (BASE_COLUMN_WIDTHS_PX de
// equipe-table.tsx) dentro do MESMO componente KpiFrame (cantoneiras reais,
// sem duplicar o desenho), e mesma altura de gráfico (280px, ver
// grafico-evolucao.tsx). Onde um elemento real não depende de dado nenhum
// (ConsolidadoNavSidebar), ele é renderizado de verdade — não um placeholder.
//
// Isso evita o "pulo" de layout quando os dados chegam: todo bloco do
// skeleton ocupa a MESMA posição/tamanho que o elemento real vai ocupar.
//
// Exceção: a barra lateral flutuante de navegação (ConsolidadoNavSidebar) —
// antes renderizada AQUI de verdade (não depende de dado nenhum, só de
// scroll/DOM da página real). Na prática isso saía errado: ela é "use
// client" com estado próprio (hover expande 60px→300px) e os onClick fazem
// scroll até #trilho-card-N, elementos que não existem durante o loading —
// ficava um componente "de verdade", interativo mas quebrado, solto dentro
// da tela de loading, em vez de um esqueleto mudo como todo o resto.
// Trocada por um placeholder mudo (SkeletonNavSidebar, abaixo) na MESMA
// posição/tamanho (fixed, top-24 right-4, 60px colapsado) — mesmo tratamento
// dos outros blocos desta tela.
import { Instrument_Sans } from "next/font/google";

import "./reports-consolidado.css";
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

// Larguras reais das colunas da EquipeTable (BASE_COLUMN_WIDTHS_PX, ver
// equipe-table.tsx) — Operador / Retidos / Cancelados / Pedidos / Tx Retenção.
// Soma = 760px, igual à largura-base usada em gestor-equipe-section.tsx
// (width: `${760 + cardChromePx}px` quando a coluna RV Diário está fechada —
// o padrão inicial mais comum, por isso o skeleton assume esse estado).
const TABLE_COLUMN_WIDTHS_PX = [190, 127, 127, 126, 190] as const;
const TABLE_GRID_TEMPLATE = TABLE_COLUMN_WIDTHS_PX.map((w) => `${w}px`).join(" ");
const TABLE_ROWS = 13;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Linha de botões — MESMAS classes/ordem/tamanhos de gestor-equipe-section.tsx:
 * [config] [limpar base] [copiar imagem] [exibir RV + toggle], todos h-8. */
function SkeletonBarraDeAcoes() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-8 shrink-0" />
      <SkeletonBloco className="h-8 w-[148px] shrink-0" />
      <div className="inline-flex h-8 items-center gap-2">
        <SkeletonBloco className="h-3.5 w-[60px]" />
        <SkeletonBloco className="h-[18px] w-8 rounded-full" />
      </div>
    </div>
  );
}

/** Tabela — dentro do MESMO KpiFrame real (cantoneiras verdadeiras, não
 * desenhadas de novo), header com as 5 colunas nas proporções reais e ~13
 * linhas de corpo (h-[42px], igual à altura real de cada linha). */
function SkeletonTabelaEquipe() {
  return (
    <KpiFrame className="h-full">
      <div className="overflow-hidden">
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
            className="grid h-[42px] gap-0 border-t border-border/40"
            style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
          >
            {/* Operador — bloco de texto alinhado à esquerda, como o nome real. */}
            <div className="flex items-center border-r border-border/40 px-3">
              <SkeletonBloco className="h-3 w-[75%]" />
            </div>
            {/* Retidos / Cancelados / Pedidos — bloco pequeno centralizado. */}
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex items-center justify-center border-r border-border/40 px-3">
                <SkeletonBloco className="h-3 w-8" />
              </div>
            ))}
            {/* Tx Retenção — número pequeno + barrinha fina embaixo (progress bar real). */}
            <div className="flex flex-col items-center justify-center gap-1 px-3">
              <SkeletonBloco className="h-3 w-9" />
              <SkeletonBloco className="h-1 w-12 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}

/** Painel da direita (Anexar Base) — mesmas dimensões de UploadDropzone
 * (min-h-[180px], flex-1, borda tracejada). */
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

/** Visão Geral — MESMO grid/proporções de VisaoGeralCards.tsx (1 card
 * primário col-span-2 + 3 secundários col-span-3, sm:items-end). */
function SkeletonVisaoGeral() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      <div className="h-[118px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
      <div className="grid grid-cols-3 gap-4 sm:col-span-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[86px] rounded-lg border border-border bg-card/70" />
        ))}
      </div>
    </div>
  );
}

/** Evolução de Taxa — título fora do card (real: sem container próprio,
 * StyledCard removido) + altura real do gráfico (280px, grafico-evolucao.tsx). */
function SkeletonEvolucao() {
  return (
    <div className="space-y-3">
      <div>
        <SkeletonBloco className="h-5 w-72" />
        <SkeletonBloco className="mt-2 h-3 w-[85%] max-w-md bg-card/70" />
      </div>
      <div className="h-[280px] w-full rounded-lg bg-card/60" />
    </div>
  );
}

/** Placeholder mudo da barra lateral flutuante (ConsolidadoNavSidebar) —
 * mesma casca visual (FloatingNavSidebar: fixed top-24 right-4, hidden
 * abaixo de lg, 60px colapsado, border-border/60 + rounded-xl + shadow-lg)
 * com 8 círculos no lugar dos 8 ícones reais, sem nenhuma interatividade. */
function SkeletonNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-consolidado"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-3 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBloco key={i} className="h-5 w-5 rounded-full bg-muted-foreground/15" />
        ))}
      </div>
    </div>
  );
}

// Script inline, síncrono — roda no PARSE do HTML deste fallback, antes de
// qualquer hidratação React. A guarda em JS (useLayoutEffect, ver
// RetencaoDetalheSection) só age DEPOIS que o bundle carrega e o componente
// monta; nesse intervalo (streaming deste loading.tsx + piso mínimo de
// MIN_LOADING_MS em page.tsx), o navegador já pode ter restaurado e PINTADO
// a posição de scroll salva (ex.: fim da página) — daí um "pisca" possível:
// um frame na posição antiga, só depois corrigido pra topo. Este script
// fecha essa janela, desligando a restauração nativa e forçando o topo o
// mais cedo possível (antes do primeiro paint do documento). Mesma correção
// replicada em /reports/tma-peso e /reports/tempo-indisponibilidade.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingReportsConsolidado() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <SkeletonNavSidebar />

      <div
        data-page="reports-consolidado"
        className={`relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className={`mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none`}
        >
          <div className="space-y-10">
            {/* ── Bloco Equipe (título + subtítulo + botões + tabela/anexo) ── */}
            <div className="space-y-4">
              <div>
                <div className="pt-4">
                  <SkeletonBloco className="h-9 w-[210px] md:h-10" />
                  <div className="pt-3">
                    <SkeletonBloco className="h-3.5 w-[235px] bg-card/70" />
                  </div>
                </div>

                <SkeletonBarraDeAcoes />

                <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
                  <div className="shrink-0" style={{ width: "784px", maxWidth: "100%" }}>
                    <SkeletonTabelaEquipe />
                  </div>
                  <SkeletonPainelAnexo />
                </div>
              </div>
            </div>

            {/* ── Bloco Analítico (título + Visão Geral + Evolução) ── */}
            <section>
              <header className="pt-2 pb-4 mb-6">
                <SkeletonBloco className="h-9 w-48 md:h-10" />
              </header>
              <div className="space-y-6">
                <SkeletonVisaoGeral />
                <SkeletonEvolucao />
              </div>
            </section>
          </div>
        </div>

        {/* Indicador de carregamento — nítido, centralizado sobre a área da
            tabela, sem sobrepor o cabeçalho/botões acima dele. Ícone
            substituído a pedido (dot-spinner, Uiverse.io by abrahamcalsin —
            ver dot-spinner.tsx); sem texto visível, só o spinner. */}
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-[33%] flex flex-col items-center gap-3 -translate-y-1/2"
        >
          <DotSpinner />
          <span className="sr-only">Carregando Consolidado, aguarde.</span>
        </div>
      </div>
    </>
  );
}
