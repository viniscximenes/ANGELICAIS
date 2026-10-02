// Suspense fallback do Next.js pra /s/operacao/quartil — mostrado enquanto o
// Server Component de page.tsx (fetchQuartilOperacaoAction + piso mínimo de
// MIN_LOADING_MS, ver page.tsx) não resolveu.
//
// Mesmas formas do loading de /s/operacao/comparativo (SkeletonBloco, tom
// .consolidado-skeleton, fade de entrada, sem indicador girando), espelhando
// o layout REAL desta página: título + subtítulo, os 4 cards de indicadores
// (mesmo grid de VisaoGeralCards) e a lista de supervisores (mesmo
// StyledCard e grid de LinhaSupervisorQuartil).
import { Instrument_Sans } from "next/font/google";

import "./operacao-quartil.css";
// Tom dos blocos (.consolidado-skeleton) vem do CSS do Consolidado — mesmo
// import de page.tsx.
import "../../reports/consolidado/reports-consolidado.css";
import { StyledCard } from "@/components/gestor/styled-card";

// MESMA fonte/variável de page.tsx — o fallback monta antes de page.tsx.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const LINHAS_SUPERVISORES = 6;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Visão Geral — MESMO grid/proporções de VisaoGeralCards.tsx. */
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

/** Linha de supervisor — MESMO StyledCard e grid de LinhaSupervisorQuartil
 * (chevron, nome, 5 colunas de rótulo + valor). */
function SkeletonLinhaSupervisor() {
  return (
    <StyledCard className="p-0 overflow-hidden" withGradient corners="all">
      <div className="grid w-full items-center gap-x-4 gap-y-2 px-4 py-3.5 grid-cols-[auto_minmax(0,14rem)_repeat(5,minmax(0,1fr))]">
        <SkeletonBloco className="h-4 w-4 bg-card/70" />
        <SkeletonBloco className="h-4 w-36" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <SkeletonBloco className="h-2.5 w-24 bg-card/70" />
            <SkeletonBloco className="h-4 w-12" />
          </div>
        ))}
      </div>
    </StyledCard>
  );
}

// Mesmo script do loading do Consolidado: desliga a restauração de scroll
// nativa e força o topo antes do primeiro paint.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingQuartilOperacao() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />

      <div
        data-page="operacao-quartil"
        className={`consolidado-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl space-y-4 animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          {/* Cabeçalho — mesmas classes do page.tsx (pt-4 pb-2, subtítulo pt-3). */}
          <div className="pt-4 pb-2">
            <SkeletonBloco className="h-9 w-[380px] max-w-full md:h-10" />
            <div className="pt-3">
              <SkeletonBloco className="h-3.5 w-[160px] bg-card/70" />
            </div>
          </div>

          {/* Mesmo space-y-6 de QuartilSection. */}
          <div className="space-y-6">
            <SkeletonVisaoGeral />

            <div className="space-y-3">
              {Array.from({ length: LINHAS_SUPERVISORES }).map((_, i) => (
                <SkeletonLinhaSupervisor key={i} />
              ))}
            </div>
          </div>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          Carregando Quartil, aguarde.
        </div>
      </div>
    </>
  );
}
