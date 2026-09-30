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

import { DotSpinner } from "@/components/gestor/dot-spinner";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

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
  dataPage:
    | "kpi-operadores"
    | "kpi-gestor"
    | "kpi-detalhado-polo"
    | "kpi-evolucao"
    | "configuracoes-equipe"
    | "reports-consolidado"
    | "reports-tempo-indisponibilidade"
    | "reports-tma-peso"
    | "operacao-diario"
    | "operacao-comparativo-consolidado";
  /** Nome da página pro rótulo acessível ("Carregando Operadores...") e pro texto visível. */
  titulo: string;
  /**
   * Cada rota migrada usa um formato dedicado, com os cards principais na
   * mesma ordem, proporção e posição relativa da página real. "tabela" e
   * "cards" ficam disponíveis como fallback para consumidores antigos.
   */
  formato:
    | "tabela"
    | "cards"
    | "kpi-operadores"
    | "kpi-gestor"
    | "kpi-detalhado-polo"
    | "kpi-evolucao"
    | "equipe"
    | "consolidado"
    | "tempo-indisponibilidade"
    | "tma-peso"
    | "diario"
    | "comparativo";
  /**
   * Largura do container central — as páginas de KPI usam "max-w-7xl"
   * (default, preserva o comportamento atual). /configuracoes/equipe usa
   * "max-w-2xl", igual ao container real de page.tsx.
   */
  maxWidthClassName?: string;
  /**
   * Linha fantasma de ações (pill + botão) abaixo do cabeçalho, presente
   * nas páginas de KPI. /configuracoes/equipe não tem essa linha no layout
   * real, então passa `false` pra não fazer o conteúdo "pular" quando a
   * página de verdade entrar.
   */
  showActionsRow?: boolean;
  /**
   * Posição do spinner/texto. O padrão central preserva todas as telas de
   * KPI e Configurações. As páginas longas de Reports usam "after-header"
   * para manter o indicador na primeira dobra, logo abaixo do cabeçalho,
   * sem inseri-lo no fluxo e sem deslocar o skeleton.
   */
  indicatorPosition?: "center" | "after-header";
  /**
   * "ring" (padrão, preserva todas as rotas existentes): círculo genérico
   * (border animate-spin) + texto "Carregando {titulo}...".
   * "dots": spinner Uiverse.io by abrahamcalsin ("dot-spinner", ver
   * dot-spinner.tsx) + SEM texto visível (só sr-only) — usado pelo overlay
   * de refresh manual de /s/reports/consolidado (handleBaseCleared em
   * gestor-equipe-section.tsx), mesmo ícone do loading.tsx daquela rota.
   * Depende da regra CSS `.dot-spinner*` de reports-consolidado.css
   * (escopada a [data-page="reports-consolidado"]) — só usar com
   * dataPage="reports-consolidado".
   */
  spinnerVariant?: "ring" | "dots";
}

type LoadingFormato = KpiLoadingScreenProps["formato"];

function SkeletonActionsRow({ formato }: { formato: LoadingFormato }) {
  if (formato === "kpi-operadores") {
    return (
      <>
        <div className="h-8 w-64 rounded-[var(--radius)] bg-card" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-8 rounded-md bg-card" />
          <div className="h-8 w-8 rounded-md bg-card" />
          <div className="h-8 w-24 rounded-md bg-card" />
        </div>
      </>
    );
  }

  if (formato === "kpi-gestor") {
    return (
      <>
        <div className="h-8 w-64 rounded-[var(--radius)] bg-card" />
        <div className="ml-auto h-8 w-32 rounded-md bg-card" />
      </>
    );
  }

  if (formato === "kpi-detalhado-polo") {
    return <div className="h-8 w-64 rounded-md bg-card" />;
  }

  if (formato === "kpi-evolucao") {
    return (
      <>
        <div className="h-8 w-52 rounded-md bg-card" />
        <div className="h-8 w-56 rounded-[var(--radius)] bg-card" />
        <div className="h-5 w-44 rounded-full bg-card" />
      </>
    );
  }

  if (formato === "tempo-indisponibilidade") {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded-md bg-card" />
        <div className="h-8 w-8 rounded-md bg-card" />
        <div className="h-8 w-[148px] rounded-md bg-card" />
      </div>
    );
  }

  if (formato === "consolidado" || formato === "tma-peso") {
    return (
      <div className="ml-auto flex gap-2">
        <div className="h-8 w-8 rounded-md bg-card" />
        <div className="h-8 w-8 rounded-md bg-card" />
        <div className="h-8 w-32 rounded-md bg-card" />
      </div>
    );
  }

  return (
    <>
      <div className="h-8 w-64 rounded-[var(--radius)] bg-card" />
      <div className="ml-auto h-8 w-8 rounded-md bg-card" />
    </>
  );
}

function SkeletonTable({ rows = 9 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="h-10 bg-card" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 border-t border-border/60 bg-background" />
      ))}
    </div>
  );
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
  return <SkeletonTable />;
}

function SkeletonKpiOperadores() {
  return <SkeletonTable rows={10} />;
}

function SkeletonKpiGestor() {
  return (
    <div className="space-y-8">
      {["principais", "complementares"].map((secao) => (
        <section key={secao} className="space-y-3">
          <div className="h-5 w-36 rounded bg-card" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[150px] rounded-lg border border-border bg-card" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SkeletonKpiDetalhadoPolo() {
  return <SkeletonTable rows={10} />;
}

function SkeletonKpiEvolucao() {
  return (
    <div className="space-y-8">
      <div className="h-20 rounded-lg border border-dashed border-border bg-card" />
      <div className="h-36 rounded-lg border border-border bg-card" />

      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <section key={i} className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div className="h-5 w-40 rounded bg-card" />
              <div className="h-8 w-20 rounded bg-card" />
            </div>
            <div className="h-[320px] rounded-lg border border-border bg-card" />
          </section>
        ))}
      </div>

      <section className="space-y-3">
        <div className="h-4 w-44 rounded bg-card" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-card" />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Esqueleto de /configuracoes/equipe: linha de toggle, tabela de
 * operadores e linha de "adicionar" — mesma sequência vertical de
 * EquipeConfig (dentro de ConfigFrame, que não tem borda/fundo próprios,
 * só as cantoneiras — por isso nenhum wrapper com borda aqui, diferente de
 * SkeletonTabela).
 */
function SkeletonEquipe() {
  return (
    <div className="space-y-4">
      <div className="border-border flex items-center justify-between gap-4 border-b border-dashed pb-4">
        <div className="space-y-2">
          <div className="h-4 w-56 rounded bg-card" />
          <div className="h-3 w-72 rounded bg-card/70" />
        </div>
        <div className="h-5 w-9 shrink-0 rounded-full bg-card" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="h-10 bg-card" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 border-t border-border/60 bg-background" />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <div className="h-9 flex-1 rounded-md bg-card" />
        <div className="h-9 w-28 shrink-0 rounded-md bg-card" />
      </div>
    </div>
  );
}

/**
 * /s/reports/consolidado: tabela e anexo lado a lado; abaixo, o primeiro
 * slide do Analítico com o card principal, três secundários e o gráfico.
 *
 * Os 4 cards de resumo (card principal + 3 secundários) mantêm borda/fundo
 * — mesma caixa neutra de VisaoGeralCards, que não foi alterada. O gráfico
 * de evolução, por outro lado, NÃO tem mais container próprio (StyledCard
 * removido a pedido) — o esqueleto reflete isso: sem borda, só uma forma
 * (`bg-card/60`) sugerindo a área do gráfico, do MESMO tamanho/posição.
 */
function SkeletonConsolidado() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,760px)_1fr]">
        <SkeletonTable rows={10} />
        <div className="min-h-[180px] rounded-lg border border-border bg-card" />
      </div>

      {/*
        Altura aproximada da MESMA ordem de grandeza do trilho horizontal
        pinado (RetencaoHorizontalScroll, lg:h-[min(80vh,700px)]) — reduz a
        diferença de altura entre o esqueleto e o conteúdo real que substitui
        o Suspense fallback, evitando um salto de layout grande logo após o
        loading.tsx sumir (que, combinado com a posição de scroll do
        usuário, podia parecer um "vazio" momentâneo até o navegador
        reposicionar o conteúdo real).
      */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
          <div className="h-[118px] rounded-lg border border-border bg-card sm:col-span-2" />
          <div className="grid grid-cols-3 gap-4 sm:col-span-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[86px] rounded-lg border border-border bg-card" />
            ))}
          </div>
        </div>
        <div className="h-[420px] rounded-lg bg-card/60 lg:h-[600px]" />
      </div>
    </div>
  );
}

function SkeletonTempoIndisponibilidade() {
  const colunas = [200, 150, 110, 140, 120, 110, 190, 170] as const;
  const gridTemplateColumns = colunas
    .map((largura, indice) => indice === colunas.length - 1 ? `minmax(${largura}px, 1fr)` : `${largura}px`)
    .join(" ");

  return (
    <div className="flex flex-col gap-4">
      {/* Anexo fica acima da tabela e ocupa toda a largura nesta página. */}
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6">
        <div className="h-8 w-8 rounded-full bg-muted-foreground/15" />
        <div className="h-3 w-32 rounded-md bg-muted-foreground/15" />
      </div>

      <div className="space-y-6">
        {/* Tabela principal abaixo do anexo, usando toda a largura e altura. */}
        <KpiFrame className="h-full">
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="w-full min-w-[1190px]">
                <div
                  className="grid h-9 gap-0 border-l-2 border-l-transparent bg-muted/40"
                  style={{ gridTemplateColumns }}
                >
                  {colunas.map((_, i) => (
                    <div key={i} className="flex items-center justify-center border-r border-border/40 px-3 last:border-r-0">
                      <div className="h-3 w-[68%] rounded bg-muted-foreground/20" />
                    </div>
                  ))}
                </div>

                {Array.from({ length: 13 }).map((_, row) => (
                  <div
                    key={row}
                    className="grid h-11 gap-0 border-t border-l-2 border-t-border/40 border-l-transparent"
                    style={{ gridTemplateColumns }}
                  >
                    {colunas.map((_, col) => (
                      <div key={col} className="flex items-center justify-center border-r border-border/30 px-3 last:border-r-0">
                        <div className={`h-3 rounded bg-card ${col === 0 ? "w-[72%]" : "w-10"}`} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </KpiFrame>

        {/* Primeiro trecho do Analítico nas mesmas posições do conteúdo real. */}
        <section>
          <header className="pt-2 pb-4 mb-6">
            <div className="h-9 w-40 rounded-md bg-card md:h-10" />
          </header>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-end">
              <div className="h-[118px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
              <div className="h-[118px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
              <div className="h-[86px] rounded-lg border border-border bg-card/70" />
              <div className="h-[86px] rounded-lg border border-border bg-card/70" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="h-5 w-64 rounded bg-card" />
                <div className="mt-2 h-3 w-[420px] max-w-full rounded bg-card/70" />
              </div>
              <div className="overflow-hidden">
                <div className="h-9 bg-muted/40" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-11 border-t border-border/40 bg-background" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Placeholder mudo da navegação lateral desta página. Replica a casca da
 * sidebar real, mas usa cinco formas neutras no lugar dos cinco links para
 * não deixar controles interativos disponíveis durante o loading. */
function SkeletonTempoIndispNavSidebar() {
  return (
    <div
      aria-hidden="true"
      data-page="reports-tempo-indisponibilidade"
      className="fixed top-24 right-4 z-40 hidden lg:block"
    >
      <div className="border-border/60 flex w-[60px] flex-col items-center gap-3 rounded-xl border py-4 shadow-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 w-5 rounded-full bg-muted-foreground/15" />
        ))}
      </div>
    </div>
  );
}

/**
 * /s/reports/tma-peso (usado só pelo overlay de refresh manual — o
 * carregamento inicial tem loading.tsx próprio, ver comentário lá): tabela e
 * anexo lado a lado; abaixo, cards resumo (TMA + Atendidos) e o gráfico de
 * Evolução do TMA.
 *
 * O gráfico, por outro lado, NÃO tem mais container próprio (StyledCard
 * removido a pedido) — o esqueleto reflete isso: sem borda, só uma forma
 * (`bg-card/60`) sugerindo a área do gráfico, do MESMO tamanho/posição.
 */
function SkeletonTmaPeso() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,786px)_1fr]">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-10 bg-card" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-11 border-t border-border/60 bg-background" />
          ))}
        </div>
        <div className="min-h-[180px] rounded-lg border border-dashed border-border bg-card/40" />
      </div>

      <div className="space-y-4">
        <div className="h-6 w-28 rounded bg-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
          <div className="h-[128px] rounded-lg border border-border bg-card/70 sm:col-span-2" />
          <div className="h-[92px] rounded-lg border border-border bg-card/70 sm:col-span-3" />
        </div>
        <div className="h-[280px] rounded-lg bg-card/60" />
      </div>
    </div>
  );
}

function SkeletonDiario() {
  return (
    <div className="space-y-8">
      <div className="h-[90px] rounded-lg border border-border bg-card p-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="mt-3 h-11 rounded-md border border-dashed border-border bg-muted/40" />
      </div>

      <section className="space-y-4">
        <div className="h-6 w-36 rounded bg-card" />
        <SkeletonTable rows={7} />
      </section>
    </div>
  );
}

/**
 * Esqueleto de /operacao/comparativo-consolidado: o bloco fixo "Meus
 * indicadores" (grade de 4 cards, mesmo formato de VisaoGeralCards) seguido
 * de algumas linhas fantasmas de gestor (mesma altura de
 * LinhaGestorComparativo fechada).
 */
function SkeletonComparativo() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[110px] rounded-lg border border-border bg-card" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-5 w-56 rounded bg-card" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

export function KpiLoadingScreen({
  dataPage,
  titulo,
  formato,
  maxWidthClassName = "max-w-7xl",
  showActionsRow = true,
  indicatorPosition = "center",
  spinnerVariant = "ring",
}: KpiLoadingScreenProps) {
  return (
    <div
      data-page={dataPage}
      className="relative min-h-screen overflow-hidden px-6 py-8 lg:px-12 lg:py-12"
    >
      {formato === "tempo-indisponibilidade" && <SkeletonTempoIndispNavSidebar />}

      <div
        className={`mx-auto ${maxWidthClassName} animate-in fade-in duration-300 motion-reduce:animate-none`}
      >
        {/* Cabeçalho fantasma — mesma métrica do cabeçalho real (título + subtítulo + linha de ações, quando existir), pra altura/posição não pularem quando o conteúdo de verdade entrar. */}
        <div className="pt-4">
          <div
            className={
              formato === "tempo-indisponibilidade"
                ? "h-9 w-[440px] max-w-full rounded-md bg-card md:h-10"
                : "h-9 w-40 rounded-md bg-card md:h-10 md:w-48"
            }
          />
          <div className="mt-3 h-4 w-64 rounded bg-card/70" />
        </div>
        {showActionsRow && (
          <div
            className={
              formato === "tempo-indisponibilidade"
                ? "flex items-center gap-3 pt-4 pb-2"
                : "flex items-center gap-3 pt-4 pb-4"
            }
          >
            <SkeletonActionsRow formato={formato} />
          </div>
        )}

        {/* Esqueleto do conteúdo — desfocado e apagado, só pra sugerir a forma (tabela, grid de cards ou a estrutura de equipe) sem parecer dado real incompleto. */}
        <div
          aria-hidden="true"
          className={`${showActionsRow ? (formato === "tempo-indisponibilidade" ? "pt-2" : "pt-4") : "pt-8"} ${formato === "tempo-indisponibilidade" ? "" : "opacity-40 blur-[2px]"}`}
        >
          {formato === "kpi-operadores" ? (
            <SkeletonKpiOperadores />
          ) : formato === "kpi-gestor" ? (
            <SkeletonKpiGestor />
          ) : formato === "kpi-detalhado-polo" ? (
            <SkeletonKpiDetalhadoPolo />
          ) : formato === "kpi-evolucao" ? (
            <SkeletonKpiEvolucao />
          ) : formato === "tabela" ? (
            <SkeletonTabela />
          ) : formato === "cards" ? (
            <SkeletonCards />
          ) : formato === "consolidado" ? (
            <SkeletonConsolidado />
          ) : formato === "tempo-indisponibilidade" ? (
            <SkeletonTempoIndisponibilidade />
          ) : formato === "tma-peso" ? (
            <SkeletonTmaPeso />
          ) : formato === "diario" ? (
            <SkeletonDiario />
          ) : formato === "comparativo" ? (
            <SkeletonComparativo />
          ) : (
            <SkeletonEquipe />
          )}
        </div>
      </div>

      {/* Indicador de carregamento — nítido, centralizado, por cima do esqueleto. */}
      <div
        role="status"
        aria-live="polite"
        className={
          formato === "tempo-indisponibilidade"
            ? "pointer-events-none absolute inset-x-0 top-[33%] flex flex-col items-center gap-3 -translate-y-1/2"
            : indicatorPosition === "after-header"
            ? showActionsRow
              ? "pointer-events-none absolute inset-x-0 top-[12rem] flex flex-col items-center gap-3 lg:top-[13.25rem]"
              : "pointer-events-none absolute inset-x-0 top-[9rem] flex flex-col items-center gap-3 lg:top-[10.25rem]"
            : "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
        }
      >
        {spinnerVariant === "dots" ? (
          <DotSpinner />
        ) : (
          <>
            <span
              aria-hidden="true"
              className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground motion-reduce:animate-none"
            />
            <p className="ds-small text-muted-foreground">Carregando {titulo}...</p>
          </>
        )}
        <span className="sr-only">Carregando {titulo}, aguarde.</span>
      </div>
    </div>
  );
}
