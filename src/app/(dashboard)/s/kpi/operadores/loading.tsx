// Suspense fallback exclusivo de /kpi/operadores. Replica a geometria da
// página real (cabeçalho, ações à esquerda, meses à direita e KpiFrame da
// tabela) e só é usado em entrada de rota/F5/refresh do servidor. A troca de
// mês continua inteiramente no client e não passa por este arquivo.
import { Instrument_Sans } from "next/font/google";

import "./kpi-operadores.css";
import { KpiTabelaSkeleton } from "./_components/kpi-tabela-skeleton";
import { DESLIGAR_SCROLL_RESTORATION_SCRIPT } from "@/lib/scroll-restoration-script";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const TOTAL_COLUNAS_DADOS = 8;

function Bloco({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-card ${className}`} />;
}

function SkeletonAcoes() {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <Bloco className="h-8 w-8 shrink-0" />
        <Bloco className="h-8 w-[140px] shrink-0" />
        <div className="inline-flex h-8 items-center gap-2">
          <Bloco className="h-3.5 w-[60px]" />
          <Bloco className="h-[18px] w-8 rounded-full" />
        </div>
      </div>
      <Bloco className="ml-auto h-8 w-[466px] max-w-full rounded-[var(--radius)]" />
    </div>
  );
}

export default function LoadingKpiOperadores() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <div
        data-page="kpi-operadores"
        className={`kpi-operadores-skeleton relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          <div className="space-y-4">
            <div>
              <div className="pt-4">
                <Bloco className="h-9 w-[180px] md:h-10" />
                <div className="pt-3">
                  <Bloco className="h-3.5 w-[330px] max-w-full bg-card/70" />
                </div>
              </div>
              <SkeletonAcoes />
              <div className="pt-2">
                <KpiTabelaSkeleton totalColunasDados={TOTAL_COLUNAS_DADOS} />
              </div>
            </div>
          </div>
        </div>

        {/* Sem indicador girando, como no Consolidado: o carregamento é só o
            skeleton. Fica apenas o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Operadores, aguarde.
        </div>
      </div>
    </>
  );
}
