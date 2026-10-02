// Suspense fallback do Next.js pra /operacao/diario — mostrado enquanto o
// Server Component de page.tsx ainda não resolveu (inclui o piso mínimo de
// MIN_LOADING_MS, ver page.tsx).
//
// Mesmas formas do skeleton de /s/reports/consolidado (SkeletonBloco, tons
// via .diario-skeleton, tabela dentro do KpiFrame real), mas espelhando o
// layout DESTA página: título + subtítulo, card de anexo (min-h-[180px]) e a
// tabela de reports (Dia / Operador / Tema / Report / ações).
import { Instrument_Sans } from "next/font/google";

import "./operacao-diario.css";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Dia / Operador / Tema / Report (resto da largura) / ações (copiar + baixar).
const TABLE_GRID_TEMPLATE = "110px 230px 110px minmax(28rem, 1fr) 96px";
const TABLE_ROWS = 8;

function SkeletonBloco({ className }: { className: string }) {
  return (
    <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />
  );
}

/** Card de anexo — mesmas dimensões do DiarioCsvDropzone (min-h-[180px],
 * borda tracejada, rounded-xl). */
function SkeletonPainelAnexo() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
      <SkeletonBloco className="h-8 w-8 rounded-full bg-muted-foreground/15" />
      <SkeletonBloco className="h-3 w-32 bg-muted-foreground/15" />
    </div>
  );
}

/** Tabela de reports — dentro do MESMO KpiFrame real, header com as 5
 * colunas e linhas de corpo com texto de report em 2 linhas. */
function SkeletonTabelaReports() {
  return (
    <KpiFrame>
      <div className="overflow-hidden">
        <div
          className="grid h-[41px] gap-0 border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-center border-r border-border/50 px-3"
            >
              <SkeletonBloco
                className={`h-3 bg-muted-foreground/20 ${i === 3 ? "w-16" : "w-[60%]"}`}
              />
            </div>
          ))}
          <div />
        </div>

        {Array.from({ length: TABLE_ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid h-[62px] gap-0 border-b border-border/30 last:border-b-0"
            style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE }}
          >
            {/* Dia */}
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-[75%]" />
            </div>
            {/* Operador */}
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-[80%]" />
            </div>
            {/* Tema */}
            <div className="flex items-center justify-center border-r border-border/30 px-3">
              <SkeletonBloco className="h-3 w-[60%]" />
            </div>
            {/* Report — 2 linhas de texto */}
            <div className="flex flex-col justify-center gap-2 px-3">
              <SkeletonBloco className="h-3 w-[92%]" />
              <SkeletonBloco className="h-3 w-[45%] bg-card/70" />
            </div>
            {/* Ações — copiar + baixar (size-8) */}
            <div className="flex items-center justify-end gap-2 px-3">
              <SkeletonBloco className="size-8 shrink-0" />
              <SkeletonBloco className="size-8 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}

// Mesmo script de /s/reports/consolidado: desliga a restauração nativa de
// scroll e força o topo antes do primeiro paint do fallback.
const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingOperacaoDiario() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }}
      />
      <DiarioSkeleton />
    </>
  );
}

/**
 * Esqueleto do F5 — exportado pra ser reaproveitado também no overlay que
 * aparece ao anexar uma base (DiarioSection). `comFiltro` mostra o bloco do
 * filtro de temas, que só existe depois que a base gera reports.
 */
export function DiarioSkeleton({ comFiltro = false }: { comFiltro?: boolean }) {
  return (
    <div
      data-page="operacao-diario"
      className={`diario-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div
        aria-hidden="true"
        className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        {/* Cabeçalho — mesmo espaçamento do <header> de page.tsx */}
        <div className="pb-6 pt-4">
          <SkeletonBloco className="h-9 w-[130px] sm:h-10" />
          <div className="mt-3 flex h-5 items-center">
            <SkeletonBloco className="h-3.5 w-[210px] bg-card/70" />
          </div>
        </div>

        <div className="space-y-8">
          <SkeletonPainelAnexo />

          <div className="space-y-4">
            {comFiltro && (
              <div className="flex justify-start sm:justify-end">
                <SkeletonBloco className="h-[42px] w-[350px] max-w-full rounded-[var(--radius)]" />
              </div>
            )}
            <SkeletonTabelaReports />
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        Carregando Diário, aguarde.
      </div>
    </div>
  );
}
