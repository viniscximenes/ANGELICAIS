// Suspense fallback exclusivo de /kpi/operadores. Replica a geometria da
// página real (cabeçalho, ações à esquerda, meses à direita e KpiFrame da
// tabela) e só é usado em entrada de rota/F5/refresh do servidor. A troca de
// mês continua inteiramente no client e não passa por este arquivo.
import { Instrument_Sans } from "next/font/google";

import "./kpi-operadores.css";
import { DotSpinner } from "@/components/gestor/dot-spinner";
import { KpiFrame } from "./_components/kpi-frame";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const TOTAL_COLUNAS_DADOS = 8;
const TOTAL_LINHAS = 12;

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

function SkeletonTabela() {
  return (
    <KpiFrame>
      <div className="overflow-hidden">
        <table className="kpi-operadores-table border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead className="kpi-operadores-table-head ds-body font-bold text-foreground tracking-wide uppercase">
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="kpi-operadores-table-head-sticky h-10 px-2">
                <Bloco className="mx-auto h-3 w-20 bg-muted-foreground/20" />
              </th>
              {Array.from({ length: TOTAL_COLUNAS_DADOS }).map((_, coluna) => (
                <th key={coluna} className="h-10 px-2">
                  <Bloco className="mx-auto h-3 w-[70%] bg-muted-foreground/20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_LINHAS }).map((_, linha) => (
              <tr key={linha}>
                <td className="h-[42px] px-3">
                  <Bloco className="mx-auto h-3 w-[75%]" />
                </td>
                {Array.from({ length: TOTAL_COLUNAS_DADOS }).map((_, coluna) => (
                  <td key={coluna} className="h-[42px] px-3">
                    <Bloco className="mx-auto h-3 w-12" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </KpiFrame>
  );
}

const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingKpiOperadores() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <div
        data-page="kpi-operadores"
        className={`relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
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
                <SkeletonTabela />
              </div>
            </div>
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-[29rem] flex -translate-y-1/2 flex-col items-center gap-3"
        >
          <DotSpinner />
          <span className="sr-only">Carregando Operadores, aguarde.</span>
        </div>
      </div>
    </>
  );
}
