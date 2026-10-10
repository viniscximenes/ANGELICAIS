// Suspense fallback exclusivo de /s/kpi/detalhado-polo — mostrado enquanto o
// Server Component de page.tsx (getKpiDetalhado + piso mínimo de
// MIN_LOADING_MS) não resolve. Só dispara em entrada de rota/F5/refresh do
// servidor.
//
// Mesma construção do loading de /s/reports/consolidado: SkeletonBloco com
// bg-card (tons remapeados por .kpi-detalhado-skeleton em
// kpi-detalhado-polo.css, igual a .consolidado-skeleton — o bg-card puro
// ficava claro demais no tema atual), tabela como grade de <div> dentro do
// MESMO KpiFrame real, cabeçalho bg-muted/40 com divisórias border/40,
// linhas separadas por border-t border-border/40, blocos h-3 e sem
// indicador girando (só o skeleton + aviso sr-only).
//
// Geometria = a da página real, pra nada "pular" quando os dados chegam:
// mesmo wrapper (data-page, paddings, margem esquerda/largura de page.tsx),
// título + subtítulo, busca (h-8 w-64), larguras de coluna de
// kpi-detalhado-section.tsx (Operador 150 / Gestor 210 / Status 140 /
// KPIs 116+), altura do cabeçalho (py-2.5 + 1 linha ds-body + 1px de
// borda), faixa da barra de rolagem logo abaixo dele e linhas de 37px
// (py-2 + 1 linha ds-body).
import type { CSSProperties } from "react";
import { Instrument_Sans } from "next/font/google";

import "./kpi-detalhado-polo.css";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { DESLIGAR_SCROLL_RESTORATION_SCRIPT } from "@/lib/scroll-restoration-script";

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

// Colunas fixas com a largura real; as de KPI crescem como na <table> real
// (w-full + minWidth) quando sobra espaço.
const GRID_TEMPLATE = `${COL_OPERADOR_W}px ${COL_GESTOR_W}px ${COL_STATUS_W}px repeat(${TOTAL_COLUNAS_KPI}, minmax(${COL_KPI_W}px, 1fr))`;
const MIN_WIDTH = COL_OPERADOR_W + COL_GESTOR_W + COL_STATUS_W + TOTAL_COLUNAS_KPI * COL_KPI_W;
const TOTAL_COLUNAS = 3 + TOTAL_COLUNAS_KPI;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Tabela — dentro do MESMO KpiFrame real, cabeçalho bg-muted/40 com as
 * colunas nas larguras reais, faixa da barra de rolagem e 14 linhas. */
function SkeletonTabela() {
  return (
    <KpiFrame className="min-w-0">
      <div className="overflow-hidden">
        <div style={{ minWidth: MIN_WIDTH }}>
          <div
            className="grid gap-0 bg-muted/40"
            style={{
              gridTemplateColumns: GRID_TEMPLATE,
              height: "calc(1.25rem + var(--text-body) * 1.5 + 1px)",
            }}
          >
            {Array.from({ length: TOTAL_COLUNAS }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-r border-border/40 px-3 last:border-r-0"
              >
                <SkeletonBloco className="h-3 w-[70%] bg-muted-foreground/20" />
              </div>
            ))}
          </div>

          {/* Faixa da barra de rolagem horizontal (abaixo dos títulos). */}
          <div className="h-2" />

          {Array.from({ length: TOTAL_LINHAS }).map((_, linha) => (
            <div
              key={linha}
              className="grid h-[37px] gap-0 border-t border-border/40"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              {Array.from({ length: TOTAL_COLUNAS }).map((_, coluna) => (
                <div
                  key={coluna}
                  className="flex items-center justify-center border-r border-border/40 px-3 last:border-r-0"
                >
                  {/* Operador / Gestor / Status — bloco de texto; KPIs —
                      bloco pequeno de número, como no Consolidado. */}
                  <SkeletonBloco className={`h-3 ${coluna < 3 ? "w-[70%]" : "w-10"}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </KpiFrame>
  );
}

export default function LoadingKpiDetalhadoPolo() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      {/* kpi-detalhado-skeleton: tom dos blocos (kpi-detalhado-polo.css). */}
      <div
        data-page="kpi-detalhado-polo"
        className={`kpi-detalhado-skeleton relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
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
            <SkeletonBloco className="h-9 w-[230px] md:h-10" />
            <div className="pt-3">
              <SkeletonBloco className="h-3.5 w-[220px] max-w-full bg-card/70" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
            <SkeletonBloco className="h-8 w-64 rounded-[var(--radius)]" />
          </div>

          <div className="pt-2">
            <SkeletonTabela />
          </div>
        </div>

        {/* Sem indicador girando (mesmo padrão do Consolidado): o
            carregamento é só o skeleton. Fica o aviso para leitor de tela. */}
        <div role="status" aria-live="polite" className="sr-only">
          Carregando Detalhado Polo, aguarde.
        </div>
      </div>
    </>
  );
}
