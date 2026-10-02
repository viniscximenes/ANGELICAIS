import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

/**
 * Skeleton de /s/bases/kpi — mesmas formas do skeleton do Consolidado
 * (blocos bg-card arredondados, cantoneiras reais via KpiFrame, fade-in) e
 * mesmas posições/tamanhos do layout real, pra não haver "pulo" quando o
 * conteúdo chega. O tom dos blocos vem de .bases-kpi-skeleton (bases-kpi.css).
 *
 * - BasesKpiSkeleton: página inteira (loading.tsx, no F5).
 * - BasesKpiConteudoSkeleton: só o que fica abaixo da linha de controles
 *   (campo de colar + Histórico) — usado ao trocar Operadores ↔ Gestores.
 */

const HISTORICO_LINHAS = 6;

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** Tabela do Histórico: Mês / Atualizado em / Operadores / ação. */
function SkeletonHistorico() {
  const colunas = "grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-0";
  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 pt-2">
        <SkeletonBloco className="h-7 w-28" />
        <SkeletonBloco className="h-5 w-7 rounded bg-card/70" />
      </div>

      <KpiFrame>
        <div className="overflow-hidden">
          <div className={`${colunas} h-[45px] bg-muted/40 px-3`}>
            <SkeletonBloco className="h-3 w-12 bg-muted-foreground/20" />
            <SkeletonBloco className="h-3 w-28 bg-muted-foreground/20" />
            <SkeletonBloco className="h-3 w-24 bg-muted-foreground/20" />
            <div className="w-8" />
          </div>
          {Array.from({ length: HISTORICO_LINHAS }).map((_, i) => (
            <div key={i} className={`${colunas} h-[53px] border-t border-border/40 px-3`}>
              <SkeletonBloco className="h-3.5 w-32" />
              <SkeletonBloco className="h-3 w-36 bg-card/70" />
              <SkeletonBloco className="h-3 w-16 bg-card/70" />
              <SkeletonBloco className="h-8 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </KpiFrame>
    </section>
  );
}

export function BasesKpiConteudoSkeleton() {
  return (
    <div aria-hidden="true" className="bases-kpi-skeleton space-y-4 animate-in fade-in duration-300 motion-reduce:animate-none">
      {/* Campo de colar a base (min-h 120px, rounded-xl). */}
      <SkeletonBloco className="h-[120px] w-full rounded-xl bg-card/60" />
      <SkeletonHistorico />
    </div>
  );
}

export function BasesKpiSkeleton() {
  return (
    <>
      <div aria-hidden="true" className="bases-kpi-skeleton mx-auto max-w-7xl space-y-4 animate-in fade-in duration-300 motion-reduce:animate-none">
        {/* Cabeçalho: título "KPI" + nome. */}
        <div className="pt-4">
          <SkeletonBloco className="h-9 w-[72px] md:h-10" />
          <div className="pt-3">
            <SkeletonBloco className="h-3.5 w-[260px] bg-card/70" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Linha de controles: toggle Operadores/Gestores + data, h-8. */}
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBloco className="h-8 w-[178px] shrink-0" />
            <SkeletonBloco className="h-8 w-[170px] shrink-0" />
          </div>

          <SkeletonBloco className="h-[120px] w-full rounded-xl bg-card/60" />
          <SkeletonHistorico />
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        Carregando KPI, aguarde.
      </div>
    </>
  );
}
