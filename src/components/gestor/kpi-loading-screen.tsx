/**
 * Tela de loading de /kpi/operadores e /kpi/gestor (Suspense fallback do
 * Next.js — ver loading.tsx de cada rota). Server Component de propósito:
 * sem "use client" nem JS de animação (Framer Motion etc.) — precisa
 * aparecer no HTML já no primeiro streaming da navegação, antes de
 * qualquer hidratação, senão perderia a razão de existir (mostrar algo
 * enquanto o resto ainda carrega). Toda animação é CSS puro (Tailwind
 * animate-spin/animate-in), que roda sem depender de JS.
 *
 * "Fundo borrado": um esqueleto abstrato do layout da página (linhas/blocos
 * arredondados no formato de cards ou tabela), desfocado (blur) e com
 * opacidade baixa — evita mostrar uma forma "quase pronta" que pareça
 * conteúdo real incompleto, e ainda assim dá uma pista visual do que está
 * por vir. O indicador de carregamento (spinner + texto) fica nítido, por
 * cima, sem blur.
 */

interface KpiLoadingScreenProps {
  /**
   * Mesmo valor usado no wrapper da página real (data-page="kpi-operadores"/
   * "kpi-gestor") — escopa os tokens do tema Zen Linen pro loading também.
   * IMPORTANTE: quem chama este componente (loading.tsx de cada rota)
   * precisa importar o CSS do tema daquela rota (kpi-operadores.css /
   * kpi-gestor.css / kpi-detalhado-polo.css) — como page.tsx ainda não
   * montou nesse momento (é
   * literalmente o fallback de Suspense enquanto ele carrega), não dá pra
   * contar com o import do page.tsx pra trazer o CSS.
   */
  dataPage: "kpi-operadores" | "kpi-gestor" | "kpi-detalhado-polo" | "kpi-evolucao";
  /** Nome da página pro rótulo acessível ("Carregando Operadores...") e pro texto visível. */
  titulo: string;
  /** Esqueleto: "tabela" (operadores) ou "cards" (gestor) — só muda a forma dos blocos desfocados ao fundo. */
  formato: "tabela" | "cards";
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[140px] rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}

function SkeletonTabela() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="h-10 bg-card" />
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-11 border-t border-border/60 bg-background" />
      ))}
    </div>
  );
}

export function KpiLoadingScreen({ dataPage, titulo, formato }: KpiLoadingScreenProps) {
  return (
    <div
      data-page={dataPage}
      className="relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12"
    >
      <div className="mx-auto max-w-7xl animate-in fade-in duration-300 motion-reduce:animate-none">
        {/* Cabeçalho fantasma — mesma métrica do cabeçalho real (título + subtítulo + linha de ações), pra altura/posição não pularem quando o conteúdo de verdade entrar. */}
        <div className="pt-4">
          <div className="h-9 w-40 rounded-md bg-card md:h-10 md:w-48" />
          <div className="mt-3 h-4 w-64 rounded bg-card/70" />
        </div>
        <div className="flex items-center gap-3 pt-4 pb-4">
          <div className="h-8 w-64 rounded-[var(--radius)] bg-card" />
          <div className="ml-auto h-8 w-8 rounded-md bg-card" />
        </div>

        {/* Esqueleto do conteúdo — desfocado e apagado, só pra sugerir a forma (tabela ou grid de cards) sem parecer dado real incompleto. */}
        <div aria-hidden="true" className="pt-4 opacity-40 blur-[2px]">
          {formato === "tabela" ? <SkeletonTabela /> : <SkeletonCards />}
        </div>
      </div>

      {/* Indicador de carregamento — nítido, centralizado, por cima do esqueleto. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground motion-reduce:animate-none"
        />
        <p className="ds-small text-muted-foreground">Carregando {titulo}...</p>
        <span className="sr-only">Carregando {titulo}, aguarde.</span>
      </div>
    </div>
  );
}
