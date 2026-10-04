import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

/**
 * Skeleton de /s/bases/pausas (loading.tsx, no F5) — mesmas formas do
 * skeleton de /s/bases/kpi e do Consolidado (blocos bg-card arredondados,
 * cantoneiras reais via KpiFrame) nas posições do layout real. O tom dos
 * blocos vem de .bases-pausas-skeleton (bases-pausas.css).
 */

const LINHAS = 8;
// Agente / Célula / Login / Logout / D1 / P20 / D2
const COLUNAS = "grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3";

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

export function BasesPausasSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="bases-pausas-skeleton mx-auto max-w-7xl space-y-4 animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        {/* Cabeçalho: título "Pausas" + nome. */}
        <div className="pt-4">
          <SkeletonBloco className="h-9 w-[130px] md:h-10" />
          <div className="pt-3">
            <SkeletonBloco className="h-3.5 w-[260px] bg-card/70" />
          </div>
        </div>

        {/* Campo de colar (min-h 120px, rounded-xl). */}
        <SkeletonBloco className="h-[120px] w-full rounded-xl bg-card/60" />

        {/* Base Atual: título + contador + Limpar Base, depois a tabela. */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <SkeletonBloco className="h-7 w-32" />
              <SkeletonBloco className="h-5 w-7 rounded bg-card/70" />
            </div>
            <SkeletonBloco className="h-8 w-8 shrink-0" />
          </div>

          <KpiFrame>
            <div className="overflow-hidden">
              <div className={`${COLUNAS} h-[45px] bg-muted/40 px-3`}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonBloco key={i} className="h-3 w-[60%] bg-muted-foreground/20" />
                ))}
              </div>
              {Array.from({ length: LINHAS }).map((_, i) => (
                <div key={i} className={`${COLUNAS} h-[45px] border-t border-border/40 px-3`}>
                  <SkeletonBloco className="h-3.5 w-[80%]" />
                  <SkeletonBloco className="h-3 w-[60%] bg-card/70" />
                  {Array.from({ length: 5 }).map((_, c) => (
                    <SkeletonBloco key={c} className="h-3 w-10 bg-card/70" />
                  ))}
                </div>
              ))}
            </div>
          </KpiFrame>
        </section>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        Carregando Pausas, aguarde.
      </div>
    </>
  );
}
