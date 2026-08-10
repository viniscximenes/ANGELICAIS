"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconTarget } from "@tabler/icons-react";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { MetaGestorConfig } from "@/lib/kpi/gestor/avaliar-meta-gestor";
import {
  getKpiGestorMesHistoricoAction,
  type KpiGestorMesData,
} from "@/lib/kpi/gestor/get-kpi-gestor-mes-historico-action";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

import { DefasadosTooltipContent, KpiGestorCard, SemDadoTooltipContent } from "./kpi-gestor-card";
import { KpiGestorMetasPopover } from "./kpi-gestor-metas-popover";

interface TooltipPos {
  top: number;
  left: number;
  flip: boolean;
}

/** Metade da largura máxima do painel (max-w-[400px]) — usada pro clamp horizontal. */
const TOOLTIP_HALF_WIDTH = 200;
/** Espaço mínimo abaixo do card pra caber o painel sem virar (flip) pra cima. */
const TOOLTIP_MIN_SPACE_BELOW = 220;

const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatMesRef(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  return `${MESES_PT[Number(month) - 1]}/${year}`;
}

/** Label curto pros toggles de mês histórico: "2026-05-01" → "05/26". */
function formatMesLabel(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  return `${month}/${year.slice(2)}`;
}

function toggleBtnClass(active: boolean): string {
  return [
    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer shadow-sm transition-opacity",
    active
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60",
  ].join(" ");
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

interface KpiGestorSectionProps {
  nomeGestor: string;
  dataAtual: KpiGestorMesData;
  dataPassado: KpiGestorMesData;
  dataRetrasado: KpiGestorMesData;
  /** mes_ref (desc) dos meses fora dos 3 recentes — buscados sob demanda. */
  mesesHistoricos: string[];
  metasIniciais: Record<string, MetaGestorConfig>;
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
  const [mesSelecionado, setMesSelecionado] = useState<string>(dataAtual.mesRef);
  // Cache dos meses históricos já buscados nesta sessão.
  const [historicoCache, setHistoricoCache] = useState<Record<string, KpiGestorMesData>>({});
  const [carregandoMes, setCarregandoMes] = useState<string | null>(null);

  // Painel flutuante único de "fora da meta" — substitui um Popover por card.
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);

  const handleCardHover = useCallback((slug: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, TOOLTIP_HALF_WIDTH + 8),
      window.innerWidth - TOOLTIP_HALF_WIDTH - 8,
    );
    const flip = window.innerHeight - rect.bottom < TOOLTIP_MIN_SPACE_BELOW;
    setTooltipPos({ top: flip ? rect.top - 8 : rect.bottom + 8, left, flip });
    setHoveredKpi(slug);
  }, []);

  const handleCardLeave = useCallback(() => {
    setHoveredKpi(null);
  }, []);

  const data: KpiGestorMesData | null =
    mesSelecionado === dataAtual.mesRef
      ? dataAtual
      : mesSelecionado === dataPassado.mesRef
        ? dataPassado
        : mesSelecionado === dataRetrasado.mesRef
          ? dataRetrasado
          : (historicoCache[mesSelecionado] ?? null);

  const handleMesChange = useCallback(
    (mesRef: string) => {
      setMesSelecionado(mesRef);

      const jaDisponivel =
        mesRef === dataAtual.mesRef ||
        mesRef === dataPassado.mesRef ||
        mesRef === dataRetrasado.mesRef ||
        mesRef in historicoCache;
      if (jaDisponivel) return;

      setCarregandoMes(mesRef);
      void getKpiGestorMesHistoricoAction(mesRef).then((result) => {
        setCarregandoMes((atual) => (atual === mesRef ? null : atual));
        if (result.success) {
          setHistoricoCache((prev) => ({ ...prev, [mesRef]: result.data }));
        }
      });
    },
    [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, historicoCache],
  );

  function handleMetasSalvas() {
    setHistoricoCache({});
    router.refresh();
  }

  const principais = data?.cards.filter((c) => c.secao === "principais") ?? [];
  const complementares = data?.cards.filter((c) => c.secao === "complementares") ?? [];

  const hoveredDefasado = hoveredKpi ? data?.defasados[hoveredKpi] : undefined;
  const hoveredCard = hoveredKpi ? data?.cards.find((c) => c.configSlug === hoveredKpi) : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div>
          {/* Header row com título do Meu KPI */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <h2 className="ds-h2 flex items-center gap-2">
                <IconTarget
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                Meu KPI
              </h2>
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatMesRef(data?.mesRef ?? mesSelecionado)}
                {data?.dataCorte && ` · Dados até ${formatDateBR(data.dataCorte)}`}
              </span>
            </div>
          </div>

          {/* Linha abaixo do título: Toggles de mês na ESQUERDA e Configurar Metas na EXTREMIDADE DIREITA */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleMesChange(dataAtual.mesRef)}
                className={toggleBtnClass(mesSelecionado === dataAtual.mesRef)}
                style={{ fontSize: "12px" }}
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => handleMesChange(dataPassado.mesRef)}
                className={toggleBtnClass(mesSelecionado === dataPassado.mesRef)}
                style={{ fontSize: "12px" }}
              >
                Mês Passado
              </button>
              <button
                type="button"
                onClick={() => handleMesChange(dataRetrasado.mesRef)}
                className={toggleBtnClass(mesSelecionado === dataRetrasado.mesRef)}
                style={{ fontSize: "12px" }}
              >
                Mês Retrasado
              </button>

              <KpiGestorMetasPopover metasIniciais={metasIniciais} onSaved={handleMetasSalvas} />

              {mesesHistoricos.length > 0 && (
                <>
                  <div className="h-6 w-px shrink-0 bg-border mx-1" aria-hidden="true" />
                  <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                    {mesesHistoricos.map((mesRef) => (
                      <button
                        key={mesRef}
                        type="button"
                        onClick={() => handleMesChange(mesRef)}
                        className={toggleBtnClass(mesSelecionado === mesRef)}
                        style={{ fontSize: "12px" }}
                      >
                        {carregandoMes === mesRef && (
                          <IconLoader2 size={12} className="animate-spin" aria-hidden="true" />
                        )}
                        {formatMesLabel(mesRef)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {carregandoMes === mesSelecionado ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center rounded-xl bg-card border border-border/60">
            <IconLoader2 size={20} className="animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-medium text-muted-foreground">
              Carregando {formatMesRef(mesSelecionado)}...
            </p>
          </div>
        ) : !data || !data.hasData ? (
          <div className="p-12 text-center rounded-xl bg-card border border-border/60">
            <p className="text-xs font-medium text-muted-foreground">
              Nenhum dado encontrado para {formatMesRef(mesSelecionado)}.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <SecaoTitulo texto="Principais" count={principais.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {principais.map((card, i) => (
                  <KpiGestorCard
                    key={card.configSlug}
                    card={card}
                    delayIndex={i}
                    isHovered={hoveredKpi === card.configSlug}
                    isDimmed={hoveredKpi !== null && hoveredKpi !== card.configSlug}
                    onHover={handleCardHover}
                    onLeave={handleCardLeave}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SecaoTitulo texto="Complementares" count={complementares.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {complementares.map((card, i) => (
                  <KpiGestorCard
                    key={card.configSlug}
                    card={card}
                    delayIndex={i}
                    isHovered={hoveredKpi === card.configSlug}
                    isDimmed={hoveredKpi !== null && hoveredKpi !== card.configSlug}
                    onHover={handleCardHover}
                    onLeave={handleCardLeave}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Painel flutuante único de "fora da meta" — um só nó no DOM pra todos os cards. */}
        {hoveredKpi &&
          tooltipPos &&
          hoveredCard &&
          (hoveredCard.temDado ? hoveredDefasado?.temMeta : true) && (
            <div
              className="fixed z-50 min-w-[320px] max-w-[400px] pointer-events-none rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: tooltipPos.flip ? "translate(-50%, -100%)" : "translateX(-50%)",
              }}
            >
              {hoveredCard.temDado ? (
                <DefasadosTooltipContent defasado={hoveredDefasado!} card={hoveredCard} />
              ) : (
                <SemDadoTooltipContent card={hoveredCard} />
              )}
            </div>
          )}
      </div>
    </TooltipProvider>
  );
}
