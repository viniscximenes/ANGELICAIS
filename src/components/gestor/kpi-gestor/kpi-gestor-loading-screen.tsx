/**
 * Telas de loading exclusivas de /kpi/gestor. Sem "use client" de propósito:
 * usadas tanto pelo loading.tsx da rota (Suspense fallback — F5/entrada)
 * quanto pelo KpiGestorSection (skeleton da troca de mês e overlay do
 * refresh após salvar metas). Só markup + CSS, sem estado.
 *
 * Mesma abordagem do loading.tsx de /s/reports/consolidado: espelha o layout
 * real (mesmo wrapper, paddings, cabeçalho, linha de ações e grid dos cards)
 * pra nada "pular" quando o conteúdo de verdade entra.
 */
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

/** Mesma quantidade de cards por seção de KPI_GESTOR_CARDS. */
const TOTAL_PRINCIPAIS = 7;
const TOTAL_COMPLEMENTARES = 16;

/** Mesmo bloco do loading.tsx de /s/reports/consolidado. O tom vem da
 * classe kpi-gestor-skeleton (kpi-gestor.css), não do bg-card — no tema
 * claro o bg-card some sobre o fundo da página. */
function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

/** "Card fantasma" no formato dos cards de Visão Geral do skeleton do
 * Consolidado (rounded-lg border bg-card/70), com a mesma casca/altura do
 * CardBody (kpi-gestor-card.tsx). Os blocos internos ocupam a posição do
 * rótulo, do valor e da linha de meta. */
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-lg p-6 flex flex-col justify-between min-h-[140px] h-full border border-border bg-card/70">
      <div>
        <div className="mb-2 flex h-4 items-center">
          <SkeletonBloco className="h-3 w-24" />
        </div>
        <div className="flex h-10 items-center">
          <SkeletonBloco className="h-8 w-28" />
        </div>
      </div>
      <div className="mt-3 flex h-4 items-center">
        <SkeletonBloco className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Mesmo espaçamento de SecaoTitulo (pt-2, rótulo + contador + linha). */
function SkeletonSecao({ totalCards }: { totalCards: number }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3 pt-2">
        <div className="flex h-[19px] items-center gap-2">
          <SkeletonBloco className="h-3 w-24" />
          <SkeletonBloco className="h-[18px] w-5 rounded" />
        </div>
        <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: totalCards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

/** Mesma moldura/altura do estado "Nenhum dado encontrado" de
 * KpiGestorSection (KpiFrame min-h-[220px], ícone 40px + 2 linhas). */
function SkeletonSemDados() {
  return (
    <KpiFrame className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <SkeletonBloco className="size-10 rounded-xl" />
      <div className="flex flex-col items-center space-y-1">
        <div className="flex h-5 items-center">
          <SkeletonBloco className="h-3.5 w-[240px]" />
        </div>
        <div className="flex h-4 items-center">
          <SkeletonBloco className="h-3 w-[330px] max-w-full bg-card/70" />
        </div>
      </div>
    </KpiFrame>
  );
}

/** Só a área de conteúdo (troca de mês e tela de F5/refresh). Com
 * `semDados`, espelha o estado "Nenhum dado encontrado" em vez dos cards. */
export function KpiGestorCardsSkeleton({
  totalPrincipais = TOTAL_PRINCIPAIS,
  totalComplementares = TOTAL_COMPLEMENTARES,
  semDados = false,
}: {
  totalPrincipais?: number;
  totalComplementares?: number;
  semDados?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando indicadores"
      className="kpi-gestor-skeleton animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      {semDados ? (
        <SkeletonSemDados />
      ) : (
        <div className="space-y-8">
          <SkeletonSecao totalCards={totalPrincipais} />
          <SkeletonSecao totalCards={totalComplementares} />
        </div>
      )}
    </div>
  );
}

/**
 * Tela inteira (F5/entrada de rota e overlay do refresh após salvar metas).
 * Mesmas classes do wrapper de page.tsx e da estrutura de KpiGestorSection:
 * título (h-9/md:h-10) → subtítulo (pt-3, linha de 20px) → linha de ações
 * (pt-4 pb-4: engrenagem h-8 à esquerda, seletor de mês h-8 à direita) →
 * conteúdo (space-y-4 → mt-4). Sem indicador girando, como no Consolidado:
 * o carregamento é só o skeleton.
 */
export function KpiGestorLoadingScreen({
  fontClassName = "",
  semDados = false,
  totalPrincipais,
  totalComplementares,
}: {
  fontClassName?: string;
  semDados?: boolean;
  totalPrincipais?: number;
  totalComplementares?: number;
}) {
  return (
    <div
      data-page="kpi-gestor"
      className={`kpi-gestor-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${fontClassName}`}
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
          <SkeletonBloco className="ml-auto h-8 w-[205px] rounded-[var(--radius)]" />
        </div>

        <div className="mt-4">
          <KpiGestorCardsSkeleton
            semDados={semDados}
            totalPrincipais={totalPrincipais}
            totalComplementares={totalComplementares}
          />
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        Carregando Gestor, aguarde.
      </div>
    </div>
  );
}
