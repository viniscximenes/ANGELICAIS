"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCalendarOff, IconX } from "@tabler/icons-react";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { MetaGestorConfig } from "@/lib/kpi/gestor/avaliar-meta-gestor";
import {
  getKpiGestorMesHistoricoAction,
  type KpiGestorMesData,
} from "@/lib/kpi/gestor/get-kpi-gestor-mes-historico-action";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";
// Reaproveitados de /kpi/operadores (NÃO alterado) — mesmo padrão já usado
// por KpiEquipeSection (src/components/operacional/kpi-equipe-section.tsx),
// que importa vários _components dessa rota de fora dela. Preferido a
// duplicar o seletor de mês/formatação aqui.
import { MesSelector } from "@/app/(dashboard)/s/kpi/operadores/_components/mes-selector";
import { formatMesCapitalizado } from "@/app/(dashboard)/s/kpi/operadores/_components/mes-format";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

import { DefasadosTooltipContent, KpiGestorCard, SemDadoTooltipContent } from "./kpi-gestor-card";
import type { KpiGestorCardSerial } from "@/lib/kpi/gestor/build-kpi-gestor-cards";
import { KpiGestorMetasPopover } from "./kpi-gestor-metas-popover";
import { KpiGestorCardsSkeleton, KpiGestorLoadingScreen } from "./kpi-gestor-loading-screen";

interface TooltipPos {
  top: number;
  left: number;
  flip: boolean;
}

/** Metade da largura máxima do painel (max-w-[400px]) — usada pro clamp horizontal. */
const TOOLTIP_HALF_WIDTH = 200;
/** Espaço mínimo abaixo do card pra caber o painel sem virar (flip) pra cima. */
const TOOLTIP_MIN_SPACE_BELOW = 220;

// Peso do título "Gestor" — mesmo padrão de TITULO_WEIGHT_CLASS em
// kpi-equipe-section.tsx ("Operadores"), isolado aqui pelo mesmo motivo.
const TITULO_WEIGHT_CLASS = "font-semibold";

/** Separador "·" do subtítulo — cópia do SubtituloSeparador de
 *  kpi-equipe-section.tsx (não exportado de lá, então replicado aqui;
 *  mesmo visual/estilo). */
function SubtituloSeparador() {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        marginInline: "0.5rem",
        color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)",
      }}
    >
      ·
    </span>
  );
}

function SecaoTitulo({
  texto,
  count,
}: {
  texto: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {texto}
        </span>
        {typeof count === "number" && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground font-medium">
            {count}
          </span>
        )}
      </div>
      <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
    </div>
  );
}

/** Piso do skeleton na troca de mês — mesmo valor de MIN_TABELA_LOADING_MS em
 * kpi-equipe-section.tsx (/kpi/operadores). */
const MIN_CARDS_LOADING_MS = 2000;

/** Piso da tela de loading do refresh após salvar metas — mesma regra de
 * MIN_REFRESH_LOADING_MS em gestor-equipe-section.tsx (/s/reports/consolidado)
 * e do MIN_LOADING_MS de page.tsx: se já demorou mais, não espera nada extra. */
const MIN_REFRESH_LOADING_MS = 3_000;

interface KpiGestorSectionProps {
  /** Nome do gestor logado, já formatado (formatNomeProprio) — linha de contexto do cabeçalho. */
  nomeGestor: string;
  dataAtual: KpiGestorMesData;
  dataPassado: KpiGestorMesData;
  dataRetrasado: KpiGestorMesData;
  /** mes_ref (desc) dos meses fora dos 3 recentes — buscados sob demanda. */
  mesesHistoricos: string[];
  metasIniciais: Record<string, MetaGestorConfig>;
}

// "Nenhum dado encontrado para X." (fora do cabeçalho —
// mesmo texto/formato de antes, não tocado pela troca visual do cabeçalho).
const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatMesRef(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  return `${MESES_PT[Number(month) - 1]}/${year}`;
}

export function KpiGestorSection({
  nomeGestor,
  dataAtual,
  dataPassado,
  dataRetrasado,
  mesesHistoricos,
  metasIniciais,
}: KpiGestorSectionProps) {
  const router = useRouter();

  // Mesma guarda do Consolidado/Operadores contra a restauração assíncrona
  // de scroll do navegador (F5 abrindo onde parou). O script do loading.tsx
  // força o topo antes do primeiro paint; esta segunda camada protege os
  // frames após a montagem, quando o browser ainda pode tentar devolver a
  // posição salva. Para no primeiro gesto do usuário ou após 2s — nunca
  // prende uma rolagem intencional. useLayoutEffect: a primeira correção
  // roda antes do navegador pintar, sem flash.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const UNLOCK_MS = 2000;
    let active = true;
    let rafId = 0;
    let timeoutId = 0;

    const stop = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.clearTimeout(timeoutId);
    };

    const tick = () => {
      if (!active) return;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      rafId = requestAnimationFrame(tick);
    };

    window.scrollTo(0, 0);
    tick();

    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    timeoutId = window.setTimeout(stop, UNLOCK_MS);

    return () => {
      stop();
      window.history.scrollRestoration = previous;
    };
  }, []);
  const [mesSelecionado, setMesSelecionado] = useState<string>(dataAtual.mesRef);
  // Cache dos meses históricos já buscados nesta sessão.
  const [historicoCache, setHistoricoCache] = useState<Record<string, KpiGestorMesData>>({});
  const [carregandoMes, setCarregandoMes] = useState<string | null>(null);
  const carregamentoMesIdRef = useRef(0);
  // Mês cujos dados estão liberados pros cards. Durante toda troca de mês a
  // área dos cards mostra o skeleton; mesExibido só muda quando o piso de 2s
  // e a busca (se necessária) terminarem — mesmo padrão de dataExibida em
  // kpi-equipe-section.tsx. Guardado como mesRef (não o objeto) pra continuar
  // pegando os dados novos após router.refresh() (salvar metas).
  const [mesExibido, setMesExibido] = useState<string>(dataAtual.mesRef);

  // Painel flutuante único de "fora da meta" — substitui um Popover por card.
  // Dois estados:
  // - hoveredKpi: aberto por mouse (card OU o próprio painel — ver
  //   handlePanelEnter/handlePanelLeave abaixo). Fecha com um pequeno atraso
  //   (HOVER_CLOSE_DELAY_MS) ao sair de QUALQUER um dos dois, cancelado se o
  //   mouse entrar no outro a tempo — é isso que deixa dar pra "descer" do
  //   card até o painel e rolar a lista sem ele fechar no meio do caminho
  //   (o gap real entre os dois é de só 8px, ver calcularTooltipPos).
  // - pinnedKpi: FIXADO por clique/teclado (essencial pra touch, que não
  //   tem hover, e pra quem navega só com teclado) — painel fica aberto
  //   indefinidamente, sem depender do mouse ficar em cima de nada; fecha só
  //   por gesto explícito (botão ×, Esc, clique fora ou clique de novo no
  //   card). Tem prioridade sobre o hover.
  const HOVER_CLOSE_DELAY_MS = 200;
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
  const [pinnedKpi, setPinnedKpi] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeKpi = pinnedKpi ?? hoveredKpi;

  const cancelHoverClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /** Agenda o fechamento do hover (não mexe em pinnedKpi) — cancelado se o mouse entrar no card OU no painel antes do delay passar. */
  const scheduleHoverClose = useCallback(
    (slug: string) => {
      cancelHoverClose();
      closeTimerRef.current = setTimeout(() => {
        // Só fecha se ainda for o MESMO kpi (evita fechar um painel novo que
        // já abriu no meio do caminho, ex.: mouse passou rápido por outro card).
        setHoveredKpi((atual) => (atual === slug ? null : atual));
      }, HOVER_CLOSE_DELAY_MS);
    },
    [cancelHoverClose],
  );

  function calcularTooltipPos(rect: DOMRect): TooltipPos {
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, TOOLTIP_HALF_WIDTH + 8),
      window.innerWidth - TOOLTIP_HALF_WIDTH - 8,
    );
    const flip = window.innerHeight - rect.bottom < TOOLTIP_MIN_SPACE_BELOW;
    return { top: flip ? rect.top - 8 : rect.bottom + 8, left, flip };
  }

  const handleCardHover = useCallback(
    (slug: string, event: React.MouseEvent<HTMLDivElement>) => {
      // Algo fixado por clique: hover não rouba o painel do usuário — só
      // reabre por hover normalmente depois que ele mesmo desfixar.
      if (pinnedKpi) return;
      cancelHoverClose();
      // getBoundingClientRect() lido AQUI, síncrono dentro do handler — não
      // dentro de um updater funcional de setState, que o React pode
      // invocar depois, quando currentTarget do evento sintético já não é
      // mais válido (foi exatamente esse bug: TypeError "Cannot read
      // properties of null (reading 'getBoundingClientRect')", visto ao
      // validar com Playwright).
      setTooltipPos(calcularTooltipPos(event.currentTarget.getBoundingClientRect()));
      setHoveredKpi(slug);
    },
    [pinnedKpi, cancelHoverClose],
  );

  const handleCardLeave = useCallback(
    (slug: string) => {
      if (pinnedKpi) return;
      scheduleHoverClose(slug);
    },
    [pinnedKpi, scheduleHoverClose],
  );

  /** Mouse chegou no painel vindo do card (ou de volta dele) — cancela o fechamento agendado. */
  const handlePanelEnter = useCallback(() => {
    cancelHoverClose();
  }, [cancelHoverClose]);

  /** Mouse saiu do painel sem ir pra um card — agenda o fechamento (mesmo delay/lógica do card). */
  const handlePanelLeave = useCallback(() => {
    if (pinnedKpi || !hoveredKpi) return;
    scheduleHoverClose(hoveredKpi);
  }, [pinnedKpi, hoveredKpi, scheduleHoverClose]);

  const handleCardOpen = useCallback(
    (slug: string, event: React.SyntheticEvent<HTMLDivElement>) => {
      cancelHoverClose();
      lastTriggerRef.current = event.currentTarget;
      setTooltipPos(calcularTooltipPos(event.currentTarget.getBoundingClientRect()));
      setPinnedKpi((atual) => (atual === slug ? null : slug));
    },
    [cancelHoverClose],
  );

  const handleCloseActive = useCallback(() => {
    setPinnedKpi(null);
    setHoveredKpi(null);
    lastTriggerRef.current?.focus();
  }, []);

  // Fecha ao clicar fora do painel (exceto no próprio card fixado — o
  // onClick dele já cuida do toggle; deixar o listener global fechar
  // primeiro faria abrir de novo em seguida).
  useEffect(() => {
    if (!pinnedKpi) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const cardEl = target.closest("[data-kpi-gestor-card]") as HTMLElement | null;
      if (cardEl?.dataset.kpiGestorCard === pinnedKpi) return;
      setPinnedKpi(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [pinnedKpi]);

  // Esc fecha e devolve o foco pro card que abriu o painel.
  useEffect(() => {
    if (!pinnedKpi) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleCloseActive();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pinnedKpi, handleCloseActive]);

  // Rolar a PÁGINA (não a lista interna do painel — overflow próprio, o
  // evento "scroll" dela não borbulha pro window) invalida a posição fixa
  // do painel (hover OU fixado) — fecha em vez de deixar flutuando
  // descolado do card.
  useEffect(() => {
    if (!activeKpi) return;
    function handleWindowScrollOrResize() {
      cancelHoverClose();
      setPinnedKpi(null);
      setHoveredKpi(null);
    }
    window.addEventListener("scroll", handleWindowScrollOrResize, { passive: true });
    window.addEventListener("resize", handleWindowScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleWindowScrollOrResize);
      window.removeEventListener("resize", handleWindowScrollOrResize);
    };
  }, [activeKpi, cancelHoverClose]);

  // Limpa o timer pendente se o componente desmontar com um hover em curso.
  useEffect(() => () => cancelHoverClose(), [cancelHoverClose]);

  const data: KpiGestorMesData | null =
    mesExibido === dataAtual.mesRef
      ? dataAtual
      : mesExibido === dataPassado.mesRef
        ? dataPassado
        : mesExibido === dataRetrasado.mesRef
          ? dataRetrasado
          : (historicoCache[mesExibido] ?? null);

  // Cabeçalho (mês · data de corte) acompanha o mês selecionado na hora,
  // igual a /kpi/operadores — só os cards esperam o skeleton.
  const dataSelecionado: KpiGestorMesData | null =
    mesSelecionado === dataAtual.mesRef
      ? dataAtual
      : mesSelecionado === dataPassado.mesRef
        ? dataPassado
        : mesSelecionado === dataRetrasado.mesRef
          ? dataRetrasado
          : (historicoCache[mesSelecionado] ?? null);

  // Também fica true para meses já disponíveis: toda troca exibe o skeleton
  // por pelo menos 2s, sem esconder ou alterar os controles acima dos cards.
  const isLoadingAtual = carregandoMes === mesSelecionado;

  const handleMesChange = useCallback(
    (mesRef: string) => {
      const carregamentoId = ++carregamentoMesIdRef.current;
      setMesSelecionado(mesRef);
      setCarregandoMes(mesRef);
      // Painel de detalhes aponta pra cards do mês anterior — fecha.
      cancelHoverClose();
      setPinnedKpi(null);
      setHoveredKpi(null);

      const jaDisponivel =
        mesRef === dataAtual.mesRef ||
        mesRef === dataPassado.mesRef ||
        mesRef === dataRetrasado.mesRef ||
        mesRef in historicoCache;

      const tarefas: Promise<void>[] = [
        new Promise<void>((resolve) => window.setTimeout(resolve, MIN_CARDS_LOADING_MS)),
      ];

      if (!jaDisponivel) {
        tarefas.push(
          getKpiGestorMesHistoricoAction(mesRef).then((result) => {
            if (result.success) {
              setHistoricoCache((prev) => ({ ...prev, [mesRef]: result.data }));
            }
          }),
        );
      }

      void Promise.allSettled(tarefas).then(() => {
        if (carregamentoMesIdRef.current !== carregamentoId) return;
        setMesExibido(mesRef);
        setCarregandoMes(null);
      });
    },
    [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, historicoCache, cancelHoverClose],
  );

  // ── Refresh após salvar metas (overlay de loading, piso de 3s) ──────────
  // router.refresh() não passa pelo loading.tsx — mesmo tratamento do
  // Consolidado (handleBaseCleared): overlay com a tela de loading por cima
  // da área de conteúdo até o piso passar E os dados novos chegarem.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTarefasOk, setRefreshTarefasOk] = useState(false);
  const [isRefreshPending, startRefreshTransition] = useTransition();

  function handleMetasSalvas() {
    const mesAlvo = mesSelecionado;
    const mesHistorico =
      mesAlvo !== dataAtual.mesRef && mesAlvo !== dataPassado.mesRef && mesAlvo !== dataRetrasado.mesRef;

    cancelHoverClose();
    setPinnedKpi(null);
    setHoveredKpi(null);
    setRefreshTarefasOk(false);
    setIsRefreshing(true);
    setHistoricoCache({});
    startRefreshTransition(() => router.refresh());

    const tarefas: Promise<void>[] = [
      new Promise<void>((resolve) => window.setTimeout(resolve, MIN_REFRESH_LOADING_MS)),
    ];
    // Mês histórico aberto: cache foi limpo (metas mudaram), então rebusca
    // já dentro do mesmo loading, pra tela sair com os dados prontos.
    if (mesHistorico) {
      tarefas.push(
        getKpiGestorMesHistoricoAction(mesAlvo).then((result) => {
          if (result.success) {
            setHistoricoCache((prev) => ({ ...prev, [mesAlvo]: result.data }));
          }
        }),
      );
    }
    void Promise.allSettled(tarefas).then(() => setRefreshTarefasOk(true));
  }

  useEffect(() => {
    if (isRefreshing && refreshTarefasOk && !isRefreshPending) {
      setIsRefreshing(false);
      setRefreshTarefasOk(false);
    }
  }, [isRefreshing, refreshTarefasOk, isRefreshPending]);

  // Skeleton espelha o que vai entrar: se o mês já está em memória e não tem
  // dados, mostra a forma do "Nenhum dado encontrado"; senão, a dos cards
  // (com a mesma quantidade do mês, quando conhecida).
  const skeletonSemDados = !!dataSelecionado && !dataSelecionado.hasData;
  const skeletonPrincipais =
    dataSelecionado?.cards.filter((c) => c.secao === "principais").length || undefined;
  const skeletonComplementares =
    dataSelecionado?.cards.filter((c) => c.secao === "complementares").length || undefined;

  const principais = data?.cards.filter((c) => c.secao === "principais") ?? [];
  const complementares = data?.cards.filter((c) => c.secao === "complementares") ?? [];
  // Cor semântica de meta (verde/vermelho) só faz sentido no Mês Atual —
  // meses passados são histórico, não algo "fora da meta" agora.
  const isMesAtual = mesExibido === dataAtual.mesRef;

  const activeDefasado = activeKpi ? data?.defasados[activeKpi] : undefined;
  const activeCard = activeKpi ? data?.cards.find((c) => c.configSlug === activeKpi) : undefined;

  /** Mesma regra usada pra decidir se o painel flutuante aparece (ver abaixo) — controla os atributos de acessibilidade (role/tabIndex) do card. */
  function cardTemPainel(card: KpiGestorCardSerial): boolean {
    if (!card.temDado) return true;
    return !!data?.defasados[card.configSlug]?.temMeta;
  }

  // Lista única pro seletor de mês (desc): os 3 recentes primeiro, depois os
  // históricos — mesmo padrão de `todosMeses` em kpi-equipe-section.tsx.
  const todosMeses = useMemo(
    () => [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, ...mesesHistoricos],
    [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, mesesHistoricos],
  );

  return (
    <TooltipProvider delayDuration={200}>
      {/* Overlay do refresh após salvar metas — mesma posição do overlay do
          Consolidado: só a área de conteúdo (abaixo do header de 60px, à
          direita da sidebar de 240px em lg+), igual a um F5. */}
      {isRefreshing && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] overflow-hidden bg-background lg:left-[240px]">
          <KpiGestorLoadingScreen
            semDados={skeletonSemDados}
            totalPrincipais={skeletonPrincipais}
            totalComplementares={skeletonComplementares}
          />
        </div>
      )}

      <div className="space-y-4">
        <div>
          {/* Cabeçalho — Linha 1: só título + subtítulo (mesma estrutura de
              /kpi/operadores, kpi-equipe-section.tsx: h1 + p com nome ·
              mês · data de corte). */}
          <div className="pt-4">
            <h1
              className={cn(
                "font-sans text-3xl tracking-tight text-foreground md:text-4xl",
                TITULO_WEIGHT_CLASS,
              )}
            >
              Gestor
            </h1>
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {nomeGestor}
              <SubtituloSeparador />
              {formatMesCapitalizado(dataSelecionado?.mesRef ?? mesSelecionado)}
              {dataSelecionado?.dataCorte && (
                <>
                  <SubtituloSeparador />
                  {`Dados até ${formatDateBR(dataSelecionado.dataCorte).slice(0, 5)}`}
                </>
              )}
            </p>
          </div>

          {/* Linha 2: Configurar Metas (esquerda) + seletor de mês
              (extremidade direita) — mesma ordem de /kpi/operadores. */}
          <div className="flex flex-wrap items-center gap-3 pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <KpiGestorMetasPopover metasIniciais={metasIniciais} onSaved={handleMetasSalvas} />
            </div>

            <div className="kpi-gestor-mes-selector ml-auto">
              <MesSelector
                meses={todosMeses}
                mesSelecionado={mesSelecionado}
                onChange={handleMesChange}
                carregandoMes={carregandoMes}
              />
            </div>
          </div>
        </div>

        {isLoadingAtual ? (
          // Toda troca de mês usa este skeleton por no mínimo 2s e até a
          // busca necessária terminar — mesmo padrão de /kpi/operadores.
          <KpiGestorCardsSkeleton
            semDados={skeletonSemDados}
            totalPrincipais={skeletonPrincipais}
            totalComplementares={skeletonComplementares}
          />
        ) : !data || !data.hasData ? (
          // Mesma moldura do estado vazio de /kpi/operadores (KpiEmptyState):
          // só as cantoneiras, sem fundo/borda, texto muted em font-sans.
          <KpiFrame className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
              <IconCalendarOff size={18} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-sans text-sm font-medium text-foreground">
                Nenhum dado encontrado para {formatMesRef(mesExibido)}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                Os KPIs aparecem aqui assim que a base do mês for importada.
              </p>
            </div>
          </KpiFrame>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <SecaoTitulo texto="Principais" count={principais.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {principais.map((card) => (
                  <KpiGestorCard
                    key={card.configSlug}
                    card={card}
                    isHovered={activeKpi === card.configSlug}
                    isDimmed={activeKpi !== null && activeKpi !== card.configSlug}
                    isPinned={pinnedKpi === card.configSlug}
                    temPainel={cardTemPainel(card)}
                    isMesAtual={isMesAtual}
                    onHover={handleCardHover}
                    onLeave={handleCardLeave}
                    onOpen={handleCardOpen}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SecaoTitulo texto="Complementares" count={complementares.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {complementares.map((card) => (
                  <KpiGestorCard
                    key={card.configSlug}
                    card={card}
                    isHovered={activeKpi === card.configSlug}
                    isDimmed={activeKpi !== null && activeKpi !== card.configSlug}
                    isPinned={pinnedKpi === card.configSlug}
                    temPainel={cardTemPainel(card)}
                    isMesAtual={isMesAtual}
                    onHover={handleCardHover}
                    onLeave={handleCardLeave}
                    onOpen={handleCardOpen}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/*
          Painel flutuante único de "fora da meta" — um só nó no DOM pra
          todos os cards. SEMPRE interativo quando visível (pointer-events-
          auto), em hover OU fixado — é o que deixa o mouse "descer" do card
          até o painel e rolar a lista sem ele fechar no meio do caminho: o
          painel tem os próprios onMouseEnter/Leave (handlePanelEnter/Leave),
          que cancelam/reagendam o mesmo fechamento com atraso do card (ver
          scheduleHoverClose acima). Fixado por clique/teclado
          (pinnedKpi === activeKpi): fecha só por gesto explícito (botão ×,
          Esc, clique fora — ver useEffects acima — ou clique de novo no
          card). Em hover: fecha sozinho, com o pequeno atraso, ao sair de
          vez do card E do painel.
        */}
        {!isLoadingAtual &&
          activeKpi &&
          tooltipPos &&
          activeCard &&
          (activeCard.temDado ? activeDefasado?.temMeta : true) && (
            <div
              ref={panelRef}
              role={pinnedKpi ? "dialog" : undefined}
              aria-label={pinnedKpi ? `Detalhes de ${activeCard.label}` : undefined}
              onMouseEnter={handlePanelEnter}
              onMouseLeave={handlePanelLeave}
              className="kpi-gestor-painel fixed z-50 min-w-[320px] max-w-[400px] pointer-events-auto rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: tooltipPos.flip ? "translate(-50%, -100%)" : "translateX(-50%)",
              }}
            >
              <button
                type="button"
                onClick={handleCloseActive}
                aria-label="Fechar detalhes"
                title={pinnedKpi ? "Fechar (Esc)" : "Fechar"}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 absolute top-2.5 right-2.5 inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ring)]"
              >
                <IconX size={14} aria-hidden="true" />
              </button>
              {activeCard.temDado ? (
                <DefasadosTooltipContent defasado={activeDefasado!} card={activeCard} />
              ) : (
                <SemDadoTooltipContent card={activeCard} />
              )}
            </div>
          )}
      </div>
    </TooltipProvider>
  );
}
