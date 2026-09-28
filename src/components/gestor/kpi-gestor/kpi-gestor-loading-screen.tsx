/**
 * Telas de loading exclusivas de /kpi/gestor. Sem "use client" de propósito:
 * usadas tanto pelo loading.tsx da rota (Suspense fallback — F5/entrada)
 * quanto pelo KpiGestorSection (skeleton da troca de mês e overlay do
 * refresh após salvar metas). Só markup + CSS, sem estado.
 *
 * Mesma abordagem do loading.tsx de /reports/consolidado: espelha o layout
 * real (mesmo wrapper, paddings, cabeçalho, linha de ações e grid dos cards)
 * pra nada "pular" quando o conteúdo de verdade entra.
 */
import { DotSpinner } from "@/components/gestor/dot-spinner";

/** Mesma quantidade de cards por seção de KPI_GESTOR_CARDS. */
const TOTAL_PRINCIPAIS = 7;
const TOTAL_COMPLEMENTARES = 16;

/** Mesma casca do CardBody (kpi-gestor-card.tsx) — inclusive a classe
 * kpi-gestor-card, que aplica o fundo do tema claro (kpi-gestor.css). Os
 * blocos internos ocupam a altura do rótulo, do valor e da linha de meta. */
function SkeletonCard({ exato }: { exato: boolean }) {
  // Troca de mês: mantém o skeleton como já estava (pedido explícito — o
  // ajuste de posição exata vale só pra tela de F5/refresh).
  if (!exato) {
    return (
      <div className="kpi-gestor-card relative overflow-hidden rounded-lg p-6 flex flex-col justify-between min-h-[140px] h-full bg-card/70 border border-border shadow-[var(--shadow-sm)] backdrop-blur-md">
        <div>
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted-foreground/20 motion-reduce:animate-none" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
        <div className="mt-3 h-3 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="kpi-gestor-card relative overflow-hidden rounded-lg p-6 flex flex-col justify-between min-h-[140px] h-full bg-card/70 border border-border shadow-[var(--shadow-sm)] backdrop-blur-md">
      <div>
        <div className="mb-2 flex h-4 items-center">
          <div className="h-3 w-24 rounded bg-muted-foreground/15" />
        </div>
        <div className="flex h-10 items-center">
          <div className="h-8 w-28 rounded bg-muted-foreground/15" />
        </div>
      </div>
      <div className="mt-3 flex h-4 items-center">
        <div className="h-3 w-20 rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/** Mesmo espaçamento de SecaoTitulo (pt-2, rótulo + contador + linha). */
function SkeletonSecao({ totalCards, exato }: { totalCards: number; exato: boolean }) {
  return (
    <section className="space-y-3">
      {exato ? (
        <div className="flex h-[27px] items-end gap-3 pt-2">
          <div className="flex h-[19px] items-center">
            <SkeletonBloco className="h-3 w-24" />
          </div>
          <div className="mb-[9px] h-px flex-1 bg-border/40" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20 motion-reduce:animate-none" />
          <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: totalCards }).map((_, i) => (
          <SkeletonCard key={i} exato={exato} />
        ))}
      </div>
    </section>
  );
}

/** Só a área dos cards. Sem `exato`: skeleton da troca de mês (cabeçalho e
 * controles ficam). Com `exato`: usado pela tela de F5/refresh. */
export function KpiGestorCardsSkeleton({
  totalPrincipais = TOTAL_PRINCIPAIS,
  totalComplementares = TOTAL_COMPLEMENTARES,
  exato = false,
}: {
  totalPrincipais?: number;
  totalComplementares?: number;
  exato?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando indicadores" className="space-y-8">
      <SkeletonSecao totalCards={totalPrincipais} exato={exato} />
      <SkeletonSecao totalCards={totalComplementares} exato={exato} />
    </div>
  );
}

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/**
 * Tela inteira (F5/entrada de rota e overlay do refresh após salvar metas).
 * Mesmas classes do wrapper de page.tsx e da estrutura de KpiGestorSection:
 * título (h-9/md:h-10) → subtítulo (pt-3, linha de 20px) → linha de ações
 * (pt-4 pb-4: engrenagem h-8 à esquerda, seletor de mês h-8 à direita) →
 * cards (space-y-4 → mt-4). Spinner igual ao do Consolidado (DotSpinner).
 */
export function KpiGestorLoadingScreen({ fontClassName = "" }: { fontClassName?: string }) {
  return (
    <div
      data-page="kpi-gestor"
      className={`relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${fontClassName}`}
    >
      <div
        aria-hidden="true"
        className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        <div className="pt-4">
          <SkeletonBloco className="h-9 w-[150px] md:h-10" />
          <div className="pt-3">
            <div className="flex h-5 items-center">
              <SkeletonBloco className="h-3.5 w-[260px] bg-card/70" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 pb-4">
          <SkeletonBloco className="h-8 w-8 shrink-0" />
          <SkeletonBloco className="ml-auto h-8 w-[280px] rounded-[var(--radius)]" />
        </div>

        <div className="mt-4">
          <KpiGestorCardsSkeleton exato />
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-[33%] flex flex-col items-center gap-3 -translate-y-1/2"
      >
        <DotSpinner />
        <span className="sr-only">Carregando Gestor, aguarde.</span>
      </div>
    </div>
  );
}
