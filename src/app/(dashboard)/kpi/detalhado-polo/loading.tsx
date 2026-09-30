// Suspense fallback exclusivo de /kpi/detalhado-polo — mostrado enquanto o
// Server Component de page.tsx (getKpiDetalhado + piso mínimo de
// MIN_LOADING_MS) não resolve. Só dispara em entrada de rota/F5/refresh do
// servidor.
//
// Replica a geometria EXATA da página real (mesmo padrão do loading de
// /kpi/operadores e /s/reports/consolidado): mesmo wrapper (data-page,
// paddings, margem esquerda/largura calculadas de page.tsx), mesmo
// cabeçalho (título + subtítulo), mesma linha da busca (h-8 w-64) e a tabela
// dentro do MESMO KpiFrame real, com as larguras de coluna reais
// (Operador 150 / Gestor 210 / Status 140 / KPIs 116, ver
// kpi-detalhado-section.tsx) e as alturas reais de cabeçalho e linhas —
// o cabeçalho herda os estilos de kpi-detalhado-polo.css. Assim nada "pula"
// quando os dados chegam.
import type { CSSProperties } from "react";
import { Instrument_Sans } from "next/font/google";

import "./kpi-detalhado-polo.css";
import { DotSpinner } from "@/components/gestor/dot-spinner";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

// MESMA fonte/variável de page.tsx — o fallback monta antes de page.tsx.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const COL_OPERADOR_W = 150;
const COL_GESTOR_W = 210;
const COL_STATUS_W = 140;
const COL_KPI_W = 116;
const TOTAL_COLUNAS_KPI = 10;
const TOTAL_LINHAS = 14;

function Bloco({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-card ${className}`} />;
}

function SkeletonTabela() {
  const minWidth = COL_OPERADOR_W + COL_GESTOR_W + COL_STATUS_W + TOTAL_COLUNAS_KPI * COL_KPI_W;
  const larguras = [
    COL_OPERADOR_W,
    COL_GESTOR_W,
    COL_STATUS_W,
    ...Array.from({ length: TOTAL_COLUNAS_KPI }, () => COL_KPI_W),
  ];

  return (
    <KpiFrame className="min-w-0">
      <div className="overflow-hidden">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr>
              {larguras.map((w, coluna) => (
                <th key={coluna} style={{ width: w, minWidth: w }}>
                  <Bloco className="mx-auto h-3 w-[60%] bg-muted-foreground/20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_LINHAS }).map((_, linha) => (
              <tr key={linha}>
                {larguras.map((_, coluna) => (
                  <td key={coluna} className="h-[37px]">
                    <Bloco className={`mx-auto h-3 ${coluna < 3 ? "w-[70%]" : "w-12"}`} />
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

export default function LoadingKpiDetalhadoPolo() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <div
        data-page="kpi-detalhado-polo"
        className={`relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className="min-w-0 animate-in fade-in duration-300 motion-reduce:animate-none"
          style={
            {
              "--kpi-detalhado-ml": "max(0px, calc((100% - 80rem) / 2))",
              marginLeft: "var(--kpi-detalhado-ml)",
              width: "min(1700px, calc(100% - var(--kpi-detalhado-ml)))",
            } as CSSProperties
          }
        >
          <div className="pt-4">
            <Bloco className="h-9 w-[230px] md:h-10" />
            <div className="pt-3">
              <Bloco className="h-3.5 w-[220px] max-w-full bg-card/70" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
            <Bloco className="h-8 w-64 rounded-[var(--radius)]" />
          </div>

          <div className="pt-2">
            <SkeletonTabela />
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-[29rem] flex -translate-y-1/2 flex-col items-center gap-3"
        >
          <DotSpinner />
          <span className="sr-only">Carregando Detalhado Polo, aguarde.</span>
        </div>
      </div>
    </>
  );
}
