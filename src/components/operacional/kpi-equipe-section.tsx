"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconSelector,
  IconChevronUp,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type { ColunaKpiDisponivel } from "@/components/gestor/config-kpi-popover";
import { CopyKpiButton } from "@/components/operacional/copy-kpi-button";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { getKpiMesHistoricoAction } from "@/lib/kpi/gestor/get-kpi-mes-historico-action";
import { getRvOperadoresAction } from "@/lib/kpi/gestor/get-rv-operadores-action";
import { toggleShowRvOperadoresAction } from "@/lib/kpi/gestor/toggle-show-rv-operadores-action";
import { KPI_COLUNAS_ORDER } from "@/lib/kpi/gestor/kpi-colunas-config";
import { saveKpiColunasAction } from "@/lib/kpi/gestor/save-kpi-colunas-action";
import type {
  KpiCelulaSerial,
  KpiEquipeSerial,
  OperadorKpiSerial,
} from "@/lib/kpi/gestor/serial-types";
import { RETIDOS_BRUTOS_SLUG } from "@/lib/kpi/gestor/retidos-brutos";
import type { KpiDefinition } from "@/lib/kpi/types";
import type { RvCalculation } from "@/lib/rv/calc-types";
import type { RvEquipeResultado } from "@/lib/rv/get-rv-para-equipe";
import type { RvScope } from "@/lib/rv/types";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";
import { MesSelector } from "@/app/(dashboard)/kpi/operadores/_components/mes-selector";
import { RvSwitch } from "@/app/(dashboard)/kpi/operadores/_components/rv-switch";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";
import { KpiEmptyState } from "@/app/(dashboard)/kpi/operadores/_components/kpi-empty-state";
import { KpiTabelaSkeleton } from "@/app/(dashboard)/kpi/operadores/_components/kpi-tabela-skeleton";
import { formatMesCapitalizado, formatMesPorExtenso } from "@/app/(dashboard)/kpi/operadores/_components/mes-format";
import { formatHeaderLabel } from "@/app/(dashboard)/kpi/operadores/_lib/format-header-label";
import { formatKpiValueLocal } from "@/app/(dashboard)/kpi/operadores/_lib/format-kpi-value-local";
import { celulaApresentacao } from "@/app/(dashboard)/kpi/operadores/_lib/celula-apresentacao";
import type { KpiAnteriorPorOperador } from "@/app/(dashboard)/kpi/operadores/_lib/get-kpi-anterior-por-emails";
import { computeEvolucaoTxRetencao, type EvolucaoTxRetencao } from "@/app/(dashboard)/kpi/operadores/_lib/kpi-delta";
import { celulaIndicadorRv } from "@/app/(dashboard)/kpi/operadores/_lib/celula-indicador-rv";
import { celulaBonusRv } from "@/app/(dashboard)/kpi/operadores/_lib/celula-bonus-rv";
import { celulaMultiplicadorRv } from "@/app/(dashboard)/kpi/operadores/_lib/celula-multiplicador-rv";
import { celulaTicketRv } from "@/app/(dashboard)/kpi/operadores/_lib/celula-ticket-rv";
import { celulaRvTotal, STYLE_SUFIXO_DESCONTO } from "@/app/(dashboard)/kpi/operadores/_lib/celula-rv-total";
import { recolorirOperadoresHistorico } from "@/app/(dashboard)/kpi/operadores/_lib/status-historico";
import { IndicadorRvHeader, IndicadorRvCell } from "@/app/(dashboard)/kpi/operadores/_components/indicador-rv-coluna";

type SortDir = "asc" | "desc";
type SortState = { slug: string; dir: SortDir };

// Peso do título "Operadores" (Instrument Sans agora — não mais serifa)
// isolado aqui pra eu poder trocar rápido pra "font-medium" (500) se 600
// ficar pesado demais no corpo renderizado real. tracking-tight já resolve
// pro -0.02em pedido (mesmo token, --tracking-tight, usado em todo o design
// system — ver globals.css).
const TITULO_WEIGHT_CLASS = "font-semibold";

/** Separador "·" do subtítulo — span próprio (aria-hidden) com respiro
 *  lateral e cor mais apagada que o texto ao redor. */
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

// Apresentação da célula (cor + fundo danger + rótulo sr-only) vem de
// _lib/celula-apresentacao.ts, que por sua vez reaproveita a COR/lógica de
// @/lib/kpi/atual/status-color.ts (fonte única, compartilhada com a tabela
// de /operacao/kpi-detalhado, NÃO alterada). O 3º parâmetro dessa função
// compartilhada (`isMesPassado`) SUPRIME a cor quando true — comportamento
// que fazia sentido enquanto meses antigos vinham sempre "neutral" do
// server. Agora `kpi.status` de meses antigos já chega recolorido pela
// mesma regra do mês atual (ver _lib/status-historico.ts), então sempre
// passamos `false` aqui pra não suprimir essa cor — sem editar o arquivo
// compartilhado, só escolhendo o argumento certo pra ele nesta rota.
function celulaInfo(kpi: KpiCelulaSerial) {
  return celulaApresentacao(kpi.status, kpi.valor === null, false);
}

function celulaVazia(h: { slug: string; displayName: string }): KpiCelulaSerial {
  return {
    slug: h.slug,
    displayName: h.displayName,
    valor: null,
    valueType: "number",
    status: "neutral",
  };
}

/**
 * Substitui op.kpis pelo conjunto de colunas VISÍVEIS (config do gestor),
 * combinando kpis (principais) + secundarios — o gestor pode promover um
 * KPI secundário (hoje só no modal) pra coluna da tabela principal.
 */
function aplicarColunasVisiveis(
  operadores: OperadorKpiSerial[],
  headers: { slug: string; displayName: string }[],
): OperadorKpiSerial[] {
  return operadores.map((op) => {
    const combinado = new Map<string, KpiCelulaSerial>();
    for (const k of op.kpis) combinado.set(k.slug, k);
    for (const k of op.secundarios) combinado.set(k.slug, k);
    const kpis = headers.map((h) => combinado.get(h.slug) ?? celulaVazia(h));
    return { ...op, kpis };
  });
}

// Slugs da dupla de colunas de retenção — TX_RETENCAO_ATUAL_SLUG é o slug
// real (existe em op.kpis); TX_RETENCAO_ANTERIOR_SLUG é sintético (só existe
// no client, pra sort/aria — nunca é gravado nem lido do banco).
const TX_RETENCAO_ATUAL_SLUG = "tx_retencao_bruta";
const TX_RETENCAO_ANTERIOR_SLUG = "tx_retencao_bruta_anterior";
// Colunas de indicador binário de RV — logo depois da coluna-base
// correspondente, sintéticas (vêm do BinaryResult já calculado por
// getRvParaEquipe, não de op.kpis). Mesmo par [slug-base, slug-sort,
// slug-indicador-no-banco] pros dois indicadores de hoje.
const INDISP_TOTAL_SLUG = "indisp_total";
const INDISP_RV_SLUG = "indisp_rv";
const INDISP_RV_INDICATOR_SLUG = "op_pausas";
const TMA_SLUG = "tma";
const TMA_RV_SLUG = "tma_rv";
const TMA_RV_INDICATOR_SLUG = "op_tma";
// "Bônus (RV)" — sintética, colada IMEDIATAMENTE ANTES de indisp_total (não
// depois de uma coluna-base própria, é um bônus combinado, não um
// indicador de um KPI só). Sort slug só, sem "slug-indicador-no-banco"
// (combinedBonusResults não é indexado por slug de indicador como
// binaryResults — pega o primeiro/único bônus do rule_set).
const BONUS_RV_SLUG = "bonus_rv";
// "Multiplicador (RV)" — logo depois de "Retidos Brutos" (rv_per_unit_indicators,
// slug 'multiplicador_retido'): valor por retido (faixa por tx_retencao_bruta)
// × contagem de retidos, já computado por calculateRv em perUnitResults.
const MULTIPLICADOR_RV_SLUG = "multiplicador_rv";
const MULTIPLICADOR_RETIDO_INDICATOR_SLUG = "multiplicador_retido";
// "Ticket (RV)" — logo depois de "% Variação Ticket" (rv_tiered_indicators,
// slug 'variacao_ticket'). VARIACAO_TICKET_SLUG é o slug da coluna-base real
// (existe em op.kpis); TICKET_RV_SLUG é sintético, só pra sort (não confundir
// com o slug do indicador no rule_set, que é o mesmo texto "variacao_ticket").
const VARIACAO_TICKET_SLUG = "variacao_ticket";
const TICKET_RV_SLUG = "ticket_rv";
const TICKET_INDICATOR_SLUG = "variacao_ticket";
// "RV (Total)" — coluna final, sempre a última; sintética só pra sort
// (usa RvCalculation.liquido, já com multiplicador de pedidos e deflatores).
const RV_TOTAL_SLUG = "rv_total";

// Espaço reservado (padding) nas duas células vizinhas à divisória de
// retenção, pro selo (~14px SVG + ~4px gap + ~36px texto + ~14px padding
// interno ≈ 68px de largura) nunca encostar no valor: metade da largura +
// 8px de folga, arredondado pra cima.
const SELO_RESERVA_PX = "42px";

// Fallback pra celulaIndicadorRv/celulaBonusRv/celulaMultiplicadorRv/
// celulaTicketRv/celulaRvTotal quando getRvCalculo não encontra o operador
// no RvEquipeResultado (não deveria acontecer, mesma equipe dos dois
// lados) — cai no mesmo "–" de "indicador não encontrado" das funções.
const CALCULO_RV_VAZIO: Pick<
  RvCalculation,
  | "status"
  | "motivoNaoElegivel"
  | "motivoIndisponibilidade"
  | "binaryResults"
  | "combinedBonusResults"
  | "perUnitResults"
  | "tieredResults"
  | "subtotal"
  | "somaDescontosPct"
  | "liquido"
  | "deflatorResults"
> = {
  status: "sem_dados",
  binaryResults: [],
  combinedBonusResults: [],
  perUnitResults: [],
  tieredResults: [],
  subtotal: 0,
  somaDescontosPct: 0,
  liquido: 0,
  deflatorResults: [],
};

function applySortToOperadores(
  operadores: OperadorKpiSerial[],
  sort: SortState,
  kpiAnterior?: KpiAnteriorPorOperador,
  getIndispRvValor?: (email: string) => number | null,
  getTmaRvValor?: (email: string) => number | null,
  getBonusRvValor?: (email: string) => number | null,
  getMultiplicadorRvValor?: (email: string) => number | null,
  getTicketRvValor?: (email: string) => number | null,
  getRvTotalValor?: (email: string) => number | null,
): OperadorKpiSerial[] {
  const valorParaOrdenar = (op: OperadorKpiSerial): number | null => {
    if (sort.slug === TX_RETENCAO_ANTERIOR_SLUG) {
      return kpiAnterior?.[op.email.trim().toLowerCase()]?.valor ?? null;
    }
    if (sort.slug === INDISP_RV_SLUG) {
      return getIndispRvValor?.(op.email) ?? null;
    }
    if (sort.slug === TMA_RV_SLUG) {
      return getTmaRvValor?.(op.email) ?? null;
    }
    if (sort.slug === BONUS_RV_SLUG) {
      return getBonusRvValor?.(op.email) ?? null;
    }
    if (sort.slug === MULTIPLICADOR_RV_SLUG) {
      return getMultiplicadorRvValor?.(op.email) ?? null;
    }
    if (sort.slug === TICKET_RV_SLUG) {
      return getTicketRvValor?.(op.email) ?? null;
    }
    if (sort.slug === RV_TOTAL_SLUG) {
      return getRvTotalValor?.(op.email) ?? null;
    }
    return op.kpis.find((k) => k.slug === sort.slug)?.valor ?? null;
  };

  return [...operadores].sort((a, b) => {
    const va = valorParaOrdenar(a);
    const vb = valorParaOrdenar(b);
    // Sem valor vai pro fim, nas duas direções (checagem antes do `dir`).
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return sort.dir === "desc" ? vb - va : va - vb;
  });
}

/**
 * Visível sempre só na coluna ordenada; nas demais, só aparece no hover/foco
 * do <th> (group/th, ver KpiOperadoresTabela) — pedido explícito de reduzir
 * ruído visual do cabeçalho.
 */
function SortIcon({ slug, sort }: { slug: string; sort: SortState }) {
  if (sort.slug !== slug) {
    return (
      <IconSelector
        size={14}
        className="ml-1 inline-block align-middle opacity-0 transition-opacity group-hover/th:opacity-50 group-focus-visible/th:opacity-50"
        aria-hidden="true"
      />
    );
  }
  return sort.dir === "asc" ? (
    <IconChevronUp size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
  ) : (
    <IconChevronDown size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
  );
}

/** Mini sparkline (14×10px, 2 pontos) do selo de evolução — sobe, desce ou fica reta (igual). */
function MiniEvolucaoSvg({ direcao, corVar }: { direcao: EvolucaoTxRetencao["direcao"]; corVar: string }) {
  const d = direcao === "up" ? "M2,8 L12,2" : direcao === "down" ? "M2,2 L12,8" : "M2,5 L12,5";
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" focusable="false">
      <path d={d} stroke={`var(${corVar})`} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Selo de evolução — sobreposto na divisória entre "Retenção (Atual)" e
 * "Retenção (dd/mm)". Posicionado a partir da célula do último
 * report (position: relative nela), centralizado na linha E na divisória
 * (left: 0 + translate -50%/-50%). aria-hidden — a célula do último report
 * já carrega o aria-label completo (ver KpiOperadoresTabela).
 */
function SeloEvolucao({ evolucao }: { evolucao: EvolucaoTxRetencao }) {
  const cor = `var(${evolucao.corVar})`;
  return (
    <span
      aria-hidden="true"
      className="absolute inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{
        left: 0,
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 30,
        pointerEvents: "none",
        backgroundColor: `color-mix(in srgb, ${cor} 12%, var(--card))`,
        border: `1px solid color-mix(in srgb, ${cor} 30%, transparent)`,
        color: cor,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <MiniEvolucaoSvg direcao={evolucao.direcao} corVar={evolucao.corVar} />
      {evolucao.texto}
    </span>
  );
}

// Fade horizontal (~24px) nas bordas do contêiner de rolagem — só entra
// quando há overflow real naquela direção (ver useEffect de scroll/resize
// em KpiOperadoresTabela). NUNCA usado na instância offscreen de export
// (essa função só é chamada quando `interativo`).
function buildScrollFadeMask(fadeLeft: boolean, fadeRight: boolean): string | undefined {
  if (!fadeLeft && !fadeRight) return undefined;
  const stops: string[] = [];
  stops.push(fadeLeft ? "transparent 0" : "black 0");
  if (fadeLeft) stops.push("black 24px");
  if (fadeRight) stops.push("black calc(100% - 24px)");
  stops.push(fadeRight ? "transparent 100%" : "black 100%");
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/* ────────────────────────────────────────────────────────────────────
   Tabela de Operadores — usada tanto na tela quanto (numa instância
   offscreen, sem os handlers interativos) na captura de PNG do
   CopyKpiButton. Mesmo componente, mesmos tokens/classes — nenhum
   template hardcoded à parte, pra imagem exportada sair idêntica ao
   que está na tela, nos dois temas.

   Modo estático (export): basta OMITIR onSort — sem esse prop, os
   headers não ficam draggable/clicáveis, mas a aparência é idêntica
   (draggable/onClick não mudam nada visualmente, só comportamento).
   ──────────────────────────────────────────────────────────────────── */
function KpiOperadoresTabela({
  operadores,
  headers,
  sort,
  rvColunaAtiva,
  mostrarToggleOlho,
  olhoAberto,
  onToggleOlho,
  onSort,
  mostrarColunaUltimoReport = false,
  kpiAnterior,
  getRvCalculo,
  dragIndex = null,
  dragOverIndex = null,
  onHeaderDragStart,
  onHeaderDragEnter,
  onHeaderDragLeave,
  onHeaderDrop,
  onHeaderDragEnd,
}: {
  operadores: OperadorKpiSerial[];
  headers: { slug: string; displayName: string }[];
  sort: SortState;
  rvColunaAtiva: boolean;
  mostrarToggleOlho?: boolean;
  olhoAberto?: boolean;
  onToggleOlho?: () => void;
  /** Presente = tabela interativa (tela); ausente = instância estática (export). */
  onSort?: (slug: string) => void;
  /** "Retenção (dd/mm)" — só no mês atual (sem toggle). */
  mostrarColunaUltimoReport?: boolean;
  kpiAnterior?: KpiAnteriorPorOperador;
  /** RvCalculation.normal (sem contestação — única fonte de RV nesta página) — usado por todas as colunas de RV. */
  getRvCalculo?: (email: string) => RvCalculation | null;
  dragIndex?: number | null;
  dragOverIndex?: number | null;
  onHeaderDragStart?: (idx: number) => void;
  onHeaderDragEnter?: (idx: number) => void;
  onHeaderDragLeave?: (e: DragEvent<HTMLTableCellElement>, idx: number) => void;
  onHeaderDrop?: (fromIndex: number, toIndex: number) => void;
  onHeaderDragEnd?: () => void;
}) {
  const interativo = !!onSort;

  // Fade nas bordas do scroll horizontal — só na tabela interativa da tela
  // (o efeito abaixo nem registra listeners quando `!interativo`, ou seja,
  // na instância offscreen de export a máscara nunca é aplicada).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    if (!interativo) return;
    const el = scrollRef.current;
    if (!el) return;

    function atualizarFade() {
      if (!el) return;
      setFadeLeft(el.scrollLeft > 1);
      setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    atualizarFade();
    el.addEventListener("scroll", atualizarFade, { passive: true });
    const observer = new ResizeObserver(atualizarFade);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizarFade);
      observer.disconnect();
    };
  }, [interativo, operadores.length, headers.length, rvColunaAtiva]);

  const scrollMask = interativo ? buildScrollFadeMask(fadeLeft, fadeRight) : undefined;

  // dd/mm do report anterior — pega a primeira célula disponível (o
  // data_corte é o mesmo pra equipe inteira, vem do mesmo import). Sem
  // nenhuma linha em kpiAnterior (equipe toda sem anterior ainda), título
  // e tooltip caem no genérico "(Anterior)"/undefined.
  const dataCorteAnteriorFormatada = (() => {
    for (const celula of Object.values(kpiAnterior ?? {})) {
      return formatDateBR(celula.dataCorte).slice(0, 5);
    }
    return null;
  })();
  const tituloRetencaoAnterior = dataCorteAnteriorFormatada
    ? `Retenção (${dataCorteAnteriorFormatada})`
    : "Retenção (Anterior)";
  const tooltipRetencaoAnterior = dataCorteAnteriorFormatada
    ? `Resultado do report de ${dataCorteAnteriorFormatada}`
    : undefined;

  // "RV (Total)" é a última coluna da linha, fora do op.kpis.map — busca o
  // RvCalculation de novo (mesma fonte getRvCalculo, sem custo extra: já
  // está em memória por rvDataAtual) em vez de tentar vazar a variável
  // `calculoRv` de dentro do map acima.
  function calculoLinhaRvTotal(email: string) {
    return rvColunaAtiva ? (getRvCalculo?.(email) ?? CALCULO_RV_VAZIO) : CALCULO_RV_VAZIO;
  }

  return (
    <KpiFrame>
      {/*
        Sticky column (Operador) precisa de um fundo OPACO — sem ele, as
        colunas de KPI aparecem "vazando" por baixo dela ao rolar
        horizontalmente. Usa var(--background), a mesma cor do resto da
        página (não um "fundo de card" à parte) — é uma necessidade
        funcional da coluna fixa, não decoração.
      */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-tema"
        style={
          scrollMask
            ? { maskImage: scrollMask, WebkitMaskImage: scrollMask }
            : undefined
        }
      >
        <table className="w-full border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th
                scope="col"
                className="font-sans text-muted-foreground sticky left-0 z-20 bg-[var(--background)] px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Operador</span>
                  {mostrarToggleOlho && (
                    <button
                      type="button"
                      onClick={onToggleOlho}
                      title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center cursor-pointer"
                    >
                      {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                    </button>
                  )}
                </div>
              </th>

              {headers.map((h, idx) => {
                const ativo = sort.slug === h.slug;
                const ariaSort = !interativo
                  ? undefined
                  : ativo
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                const ehTxAtual = h.slug === TX_RETENCAO_ATUAL_SLUG;
                const ativoAnterior = sort.slug === TX_RETENCAO_ANTERIOR_SLUG;
                const ariaSortAnterior = !interativo
                  ? undefined
                  : ativoAnterior
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";

                return (
                  <Fragment key={h.slug}>
                    {/*
                      "Bônus" — logo ANTES de "Indisp Total" (bônus
                      combinado, não é indicador de um KPI-base só; por isso
                      fica colado à esquerda dessa coluna, não à direita de
                      uma coluna-base própria como Indisp (RV)/TMA (RV)).
                      Mesmo componente genérico (_components/indicador-rv-coluna.tsx).
                    */}
                    {h.slug === INDISP_TOTAL_SLUG && rvColunaAtiva && (
                      <IndicadorRvHeader
                        titulo={formatHeaderLabel("Bônus (RV)")}
                        sortSlug={BONUS_RV_SLUG}
                        sort={sort}
                        interativo={interativo}
                        onSort={onSort}
                        sortIcon={<SortIcon slug={BONUS_RV_SLUG} sort={sort} />}
                      />
                    )}
                    <th
                      scope="col"
                      aria-sort={ariaSort}
                      tabIndex={interativo ? 0 : undefined}
                      draggable={interativo}
                      onDragStart={
                        interativo
                          ? (e) => {
                              e.dataTransfer.setData("text/plain", String(idx));
                              e.dataTransfer.effectAllowed = "move";
                              onHeaderDragStart?.(idx);
                            }
                          : undefined
                      }
                      onDragOver={
                        interativo
                          ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }
                          : undefined
                      }
                      onDragEnter={interativo ? () => onHeaderDragEnter?.(idx) : undefined}
                      onDragLeave={interativo ? (e) => onHeaderDragLeave?.(e, idx) : undefined}
                      onDrop={
                        interativo
                          ? (e) => {
                              e.preventDefault();
                              const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                              onHeaderDrop?.(fromIndex, idx);
                            }
                          : undefined
                      }
                      onDragEnd={interativo ? onHeaderDragEnd : undefined}
                      title={interativo ? "Arraste para reordenar · clique para ordenar" : undefined}
                      className={cn(
                        "group/th font-sans px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none",
                        ativo ? "text-foreground" : "text-muted-foreground",
                        interativo &&
                          "hover:text-foreground transition-colors cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                        dragIndex === idx && "opacity-50",
                        dragOverIndex !== null &&
                          dragOverIndex === idx &&
                          dragIndex !== idx &&
                          (dragIndex !== null && dragIndex < idx
                            ? "border-r-2 border-r-primary"
                            : "border-l-2 border-l-primary"),
                      )}
                      style={ehTxAtual ? { paddingRight: SELO_RESERVA_PX } : undefined}
                      onClick={interativo ? () => onSort?.(h.slug) : undefined}
                      onKeyDown={
                        interativo
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSort?.(h.slug);
                              }
                            }
                          : undefined
                      }
                    >
                      {/* "Retenção (Atual)" — mesmo slug/coluna de sempre, só renomeada na apresentação. */}
                      {ehTxAtual ? formatHeaderLabel("Retenção (Atual)") : formatHeaderLabel(h.displayName)}
                      {interativo && <SortIcon slug={h.slug} sort={sort} />}
                    </th>

                    {/*
                      "Retenção (dd/mm)" (ou "Retenção (Anterior)" sem
                      nenhum dado ainda) — coluna sintética (não existe em
                      op.kpis/kpi_definitions), colada logo depois de onde
                      "Retenção (Atual)" estiver (mesmo se o gestor arrastou
                      essa coluna pra outra posição). Some junto se
                      tx_retencao_bruta estiver oculta (nunca entra em
                      `headers` nesse caso) ou fora do mês atual.
                      paddingLeft reserva espaço pro selo não encostar no
                      valor (ver SELO_RESERVA_PX) — o espelho do pr no "Atual".
                    */}
                    {ehTxAtual && mostrarColunaUltimoReport && (
                      <th
                        scope="col"
                        aria-sort={ariaSortAnterior}
                        tabIndex={interativo ? 0 : undefined}
                        title={tooltipRetencaoAnterior}
                        onClick={interativo ? () => onSort?.(TX_RETENCAO_ANTERIOR_SLUG) : undefined}
                        onKeyDown={
                          interativo
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSort?.(TX_RETENCAO_ANTERIOR_SLUG);
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          "font-sans py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none",
                          ativoAnterior ? "text-foreground" : "text-muted-foreground",
                          interativo &&
                            "hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                        )}
                        style={{ borderLeft: "1px solid var(--border)", paddingLeft: SELO_RESERVA_PX, paddingRight: "0.75rem" }}
                      >
                        {formatHeaderLabel(tituloRetencaoAnterior)}
                        {interativo && <SortIcon slug={TX_RETENCAO_ANTERIOR_SLUG} sort={sort} />}
                      </th>
                    )}

                    {/*
                      "Indisp (RV)" — logo depois de "Indisp Total", só com
                      RV ligado. Sintética — vem do RvCalculation (op_pausas),
                      não de op.kpis. Componente genérico (_components/), o
                      mesmo usado por "TMA (RV)" logo abaixo.
                    */}
                    {h.slug === INDISP_TOTAL_SLUG && rvColunaAtiva && (
                      <IndicadorRvHeader
                        titulo={formatHeaderLabel("Indisp (RV)")}
                        sortSlug={INDISP_RV_SLUG}
                        sort={sort}
                        interativo={interativo}
                        onSort={onSort}
                        sortIcon={<SortIcon slug={INDISP_RV_SLUG} sort={sort} />}
                      />
                    )}

                    {/* "TMA (RV)" — logo depois de "TMA", mesmo componente genérico. */}
                    {h.slug === TMA_SLUG && rvColunaAtiva && (
                      <IndicadorRvHeader
                        titulo={formatHeaderLabel("TMA (RV)")}
                        sortSlug={TMA_RV_SLUG}
                        sort={sort}
                        interativo={interativo}
                        onSort={onSort}
                        sortIcon={<SortIcon slug={TMA_RV_SLUG} sort={sort} />}
                      />
                    )}

                    {/* "Multiplicador (RV)" — logo depois de "Retidos Brutos". */}
                    {h.slug === RETIDOS_BRUTOS_SLUG && rvColunaAtiva && (
                      <IndicadorRvHeader
                        titulo={formatHeaderLabel("Multiplicador (RV)")}
                        sortSlug={MULTIPLICADOR_RV_SLUG}
                        sort={sort}
                        interativo={interativo}
                        onSort={onSort}
                        sortIcon={<SortIcon slug={MULTIPLICADOR_RV_SLUG} sort={sort} />}
                      />
                    )}

                    {/* "Ticket (RV)" — logo depois de "% Variação Ticket". */}
                    {h.slug === VARIACAO_TICKET_SLUG && rvColunaAtiva && (
                      <IndicadorRvHeader
                        titulo={formatHeaderLabel("Ticket (RV)")}
                        sortSlug={TICKET_RV_SLUG}
                        sort={sort}
                        interativo={interativo}
                        onSort={onSort}
                        sortIcon={<SortIcon slug={TICKET_RV_SLUG} sort={sort} />}
                      />
                    )}
                  </Fragment>
                );
              })}
              {rvColunaAtiva && (
                <IndicadorRvHeader
                  titulo={formatHeaderLabel("RV (Total)")}
                  sortSlug={RV_TOTAL_SLUG}
                  sort={sort}
                  interativo={interativo}
                  onSort={onSort}
                  sortIcon={<SortIcon slug={RV_TOTAL_SLUG} sort={sort} />}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {operadores.map((op, i) => (
              <tr
                key={op.email}
                className="hover:bg-accent transition-colors duration-150 motion-reduce:transition-none"
                style={{
                  borderBottom:
                    i < operadores.length - 1
                      ? "1px solid color-mix(in srgb, var(--border) 60%, transparent)"
                      : undefined,
                }}
              >
                <td className="font-sans text-foreground sticky left-0 z-10 bg-[var(--background)] px-3 py-2 text-center font-medium whitespace-nowrap">
                  {op.nome}
                </td>
                {op.kpis.map((kpi) => {
                  const { style, srOnlyLabel } = celulaInfo(kpi);
                  const ehTxAtual = kpi.slug === TX_RETENCAO_ATUAL_SLUG;

                  const anteriorCelula =
                    ehTxAtual && mostrarColunaUltimoReport
                      ? kpiAnterior?.[op.email.trim().toLowerCase()]
                      : undefined;
                  const evolucao =
                    anteriorCelula && kpi.valor !== null
                      ? computeEvolucaoTxRetencao({
                          valorAtual: kpi.valor,
                          valorAnteriorFormatado: formatKpiValueLocal(anteriorCelula.valor, kpi.valueType),
                          valorAnterior: anteriorCelula.valor,
                          dataCorteAnterior: anteriorCelula.dataCorte,
                        })
                      : null;
                  const ariaLabelUltimoReport = anteriorCelula
                    ? (evolucao?.ariaLabel ??
                      `${formatKpiValueLocal(anteriorCelula.valor, kpi.valueType)} em ${formatDateBR(anteriorCelula.dataCorte).slice(0, 5)}`)
                    : undefined;

                  // RvCalculation.normal — usado pelas colunas Bônus/Indisp (RV)/
                  // TMA (RV)/Multiplicador (RV)/Ticket (RV). Buscado uma vez por
                  // linha, reaproveitado em todas.
                  const calculoRv = rvColunaAtiva ? (getRvCalculo?.(op.email) ?? null) : null;

                  return (
                    <Fragment key={kpi.slug}>
                      {/* "Bônus" — logo ANTES de "Indisp Total" (ver comentário no header). */}
                      {kpi.slug === INDISP_TOTAL_SLUG && rvColunaAtiva && (
                        <IndicadorRvCell resultado={celulaBonusRv(calculoRv ?? CALCULO_RV_VAZIO)} />
                      )}
                      <td
                        className="font-sans px-3 py-2 text-center whitespace-nowrap"
                        style={{
                          ...style,
                          fontVariantNumeric: "tabular-nums",
                          paddingRight: ehTxAtual ? SELO_RESERVA_PX : undefined,
                        }}
                      >
                        {kpi.valor === null ? (
                          <span className="text-muted-foreground">N/D</span>
                        ) : (
                          <>
                            {formatKpiValueLocal(kpi.valor, kpi.valueType)}
                            {srOnlyLabel && <span className="sr-only"> ({srOnlyLabel})</span>}
                          </>
                        )}
                      </td>

                      {/*
                        Célula sintética "Retenção (dd/mm)" —
                        position: relative é a âncora do selo (position:
                        absolute, left:0 + translate -50%/-50%, centralizado
                        na divisória E na linha). overflow visível por
                        padrão em <td> — não precisa de override. paddingLeft
                        reserva espaço pro selo não encostar no valor.
                      */}
                      {ehTxAtual && mostrarColunaUltimoReport && (
                        <td
                          className="font-sans text-muted-foreground relative py-2 text-center whitespace-nowrap"
                          style={{
                            borderLeft: "1px solid var(--border)",
                            fontVariantNumeric: "tabular-nums",
                            paddingLeft: SELO_RESERVA_PX,
                            paddingRight: "0.75rem",
                          }}
                          aria-label={ariaLabelUltimoReport}
                        >
                          <span aria-hidden={!!ariaLabelUltimoReport}>
                            {anteriorCelula
                              ? formatKpiValueLocal(anteriorCelula.valor, kpi.valueType)
                              : "–"}
                          </span>
                          {evolucao && <SeloEvolucao evolucao={evolucao} />}
                        </td>
                      )}

                      {/*
                        "Indisp (RV)"/"TMA (RV)" — mesmo componente genérico
                        (_components/indicador-rv-coluna.tsx) parametrizado
                        pelo slug do indicador; a lógica de texto/cor/tooltip
                        fica em _lib/celula-indicador-rv.ts, reaproveitando o
                        RvCalculation já calculado (calculoRv acima), sem
                        recalcular nada.
                      */}
                      {kpi.slug === INDISP_TOTAL_SLUG && rvColunaAtiva && (
                        <IndicadorRvCell
                          resultado={celulaIndicadorRv({
                            valorKpi: kpi.valor,
                            calculo: calculoRv ?? CALCULO_RV_VAZIO,
                            indicatorSlug: INDISP_RV_INDICATOR_SLUG,
                          })}
                        />
                      )}
                      {kpi.slug === TMA_SLUG && rvColunaAtiva && (
                        <IndicadorRvCell
                          resultado={celulaIndicadorRv({
                            valorKpi: kpi.valor,
                            calculo: calculoRv ?? CALCULO_RV_VAZIO,
                            indicatorSlug: TMA_RV_INDICATOR_SLUG,
                          })}
                        />
                      )}

                      {/* "Multiplicador (RV)" — logo depois de "Retidos Brutos" (ver comentário no header). */}
                      {kpi.slug === RETIDOS_BRUTOS_SLUG && rvColunaAtiva && (
                        <IndicadorRvCell
                          resultado={celulaMultiplicadorRv(calculoRv ?? CALCULO_RV_VAZIO, MULTIPLICADOR_RETIDO_INDICATOR_SLUG)}
                        />
                      )}

                      {/* "Ticket (RV)" — logo depois de "% Variação Ticket". */}
                      {kpi.slug === VARIACAO_TICKET_SLUG && rvColunaAtiva && (
                        <IndicadorRvCell resultado={celulaTicketRv(calculoRv ?? CALCULO_RV_VAZIO, TICKET_INDICATOR_SLUG)} />
                      )}
                    </Fragment>
                  );
                })}
                {rvColunaAtiva &&
                  (() => {
                    const resultado = celulaRvTotal(calculoLinhaRvTotal(op.email));
                    return (
                      <td
                        className="font-sans px-3 py-2 text-center whitespace-nowrap"
                        style={{ ...resultado.style, fontVariantNumeric: "tabular-nums" }}
                        title={resultado.title}
                        aria-label={resultado.ariaLabel}
                      >
                        {resultado.texto}
                        {resultado.sufixoDesconto && (
                          <span style={{ ...STYLE_SUFIXO_DESCONTO, marginLeft: 4 }}>{resultado.sufixoDesconto}</span>
                        )}
                      </td>
                    );
                  })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </KpiFrame>
  );
}

interface KpiEquipeSectionProps {
  /** Nome do gestor logado, já formatado (formatNomeProprio) — linha de contexto do cabeçalho. */
  nomeGestor: string;
  dataAtual: KpiEquipeSerial;
  dataPassado: KpiEquipeSerial;
  dataRetrasado: KpiEquipeSerial;
  /** mes_ref (desc) dos meses fora dos 3 recentes — buscados sob demanda. */
  mesesHistoricos: string[];
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  colunasDisponiveis: ColunaKpiDisponivel[];
  colunasVisiveisIniciais: string[];
  /** Toggle "Exibir RV" salvo — gestor_config_fantasia.show_rv_operadores. */
  showRvInicial?: boolean;
  /** Valor ANTERIOR de tx_retencao_bruta (kpi_monthly_snapshots_anterior), só do mês atual — ver _lib/get-kpi-anterior-por-emails.ts. */
  kpiAnterior?: KpiAnteriorPorOperador;
  /** kpi_definitions (thresholds atuais) — usado só pra recolorir meses ANTIGOS no client (ver _lib/status-historico.ts); mês atual já vem colorido do server. */
  kpiDefinitions: KpiDefinition[];
}

export function KpiEquipeSection({
  nomeGestor,
  dataAtual,
  dataPassado,
  dataRetrasado,
  mesesHistoricos,
  nomeFantasia,
  olhoInicial = false,
  colunasDisponiveis,
  colunasVisiveisIniciais,
  showRvInicial = false,
  kpiAnterior,
  kpiDefinitions,
}: KpiEquipeSectionProps) {
  const [mesSelecionado, setMesSelecionado] = useState<string>(dataAtual.mesRef);
  // Cache dos meses históricos já buscados (getKpiMesHistoricoAction) — evita
  // rebuscar ao alternar de volta pra um mês já visitado nesta sessão.
  const [historicoCache, setHistoricoCache] = useState<Record<string, KpiEquipeSerial>>({});
  const [carregandoMes, setCarregandoMes] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ slug: "tx_retencao_bruta", dir: "desc" });
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(colunasVisiveisIniciais);

  // ── RV (geral, mensal) ────────────────────────────────────────────
  // rvVisivel persiste por gestor (show_rv_operadores). O seletor "RV com
  // contestação" foi removido desta página — o RV exibido é sempre
  // resultado.normal (getRvParaEquipe continua calculando .contestacao
  // também, na mesma passada; só paramos de LER esse campo aqui).
  const [rvVisivel, setRvVisivel] = useState(showRvInicial);
  // Cache por mês, igual historicoCache — busca sob demanda ao ligar o
  // toggle ou trocar de mês com ele já ligado.
  const [rvCache, setRvCache] = useState<Record<string, RvEquipeResultado>>({});
  const [carregandoRv, setCarregandoRv] = useState<string | null>(null);

  const data: KpiEquipeSerial | null =
    mesSelecionado === dataAtual.mesRef
      ? dataAtual
      : mesSelecionado === dataPassado.mesRef
        ? dataPassado
        : mesSelecionado === dataRetrasado.mesRef
          ? dataRetrasado
          : (historicoCache[mesSelecionado] ?? null);

  // Última tabela com dados renderizada — mantida em tela (com opacity
  // reduzida, ver isLoadingAtual) enquanto o mês selecionado ainda está
  // carregando, pra NUNCA existir um estado vazio entre a troca de mês e a
  // chegada dos dados novos. Só troca quando `data` (o mês agora
  // selecionado) tiver conteúdo real — nunca é limpa durante o loading.
  const [dataExibida, setDataExibida] = useState<KpiEquipeSerial | null>(dataAtual);
  useEffect(() => {
    if (data) setDataExibida(data);
  }, [data]);

  // true só enquanto o mês SELECIONADO ainda está sendo buscado (não está
  // em nenhum cache ainda) — mesma flag usada pelo MesSelector pro pulso de
  // loading no item do seletor (não alterado aqui).
  const isLoadingAtual = carregandoMes === mesSelecionado;
  // Edge case: loading do mês selecionado sem NENHUMA tabela anterior pra
  // manter em tela (não deveria acontecer no uso normal — dataAtual sempre
  // vem preenchido do server — mas cobre o caso defensivamente).
  const semTabelaAnterior = isLoadingAtual && !dataExibida;

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("operacional", novoValor);
  }

  // RV só está disponível pra Mês Atual (rule_set "current") — restrito só a
  // esse mês por pedido explícito; Mês Passado, Retrasado e históricos não
  // mostram o toggle nem a coluna, mesmo que a preferência esteja "ativado".
  const scopeParaMes = useCallback(
    (mesRef: string): RvScope | null => {
      if (mesRef === dataAtual.mesRef) return "current";
      return null;
    },
    [dataAtual.mesRef],
  );

  const buscarRv = useCallback(
    (mesRef: string) => {
      const scope = scopeParaMes(mesRef);
      if (!scope) return;
      if (mesRef in rvCache) return;

      setCarregandoRv(mesRef);
      void getRvOperadoresAction(mesRef, scope).then((result) => {
        setCarregandoRv((atual) => (atual === mesRef ? null : atual));
        if (result.success) {
          setRvCache((prev) => ({ ...prev, [mesRef]: result.data }));
        } else {
          toast.error(result.error, { className: "kpi-op-toast" });
        }
      });
    },
    [scopeParaMes, rvCache],
  );

  function handleToggleRv() {
    const novoValor = !rvVisivel;
    setRvVisivel(novoValor);
    if (novoValor) buscarRv(mesSelecionado);
    void toggleShowRvOperadoresAction(novoValor);
  }

  // Se o toggle já veio ligado (preferência persistida), busca a RV do mês
  // atual assim que o componente monta — senão a coluna apareceria vazia
  // até alguma outra interação (trocar de mês) disparar a primeira busca.
  useEffect(() => {
    if (rvVisivel) buscarRv(mesSelecionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMesChange = useCallback(
    (mesRef: string) => {
      setMesSelecionado(mesRef);
      setSort({ slug: "tx_retencao_bruta", dir: "desc" });

      const jaDisponivel =
        mesRef === dataAtual.mesRef ||
        mesRef === dataPassado.mesRef ||
        mesRef === dataRetrasado.mesRef ||
        mesRef in historicoCache;
      if (!jaDisponivel) {
        setCarregandoMes(mesRef);
        void getKpiMesHistoricoAction(mesRef).then((result) => {
          setCarregandoMes((atual) => (atual === mesRef ? null : atual));
          if (result.success) {
            setHistoricoCache((prev) => ({ ...prev, [mesRef]: result.data }));
          } else {
            toast.error(result.error, { className: "kpi-op-toast" });
          }
        });
      }

      if (rvVisivel) buscarRv(mesRef);
    },
    [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, historicoCache, rvVisivel, buscarRv],
  );

  const handleSort = (slug: string) => {
    setSort((prev) => ({
      slug,
      dir: prev.slug === slug && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        window.scrollBy({ top: 120, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ top: -120, behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lista única pro seletor de mês (desc): os 3 recentes primeiro (mesma
  // ordem/cardinalidade de antes: atual, passado, retrasado), depois os
  // históricos — mesma fonte de dados de sempre, só exibidos num controle só.
  const todosMeses = useMemo(
    () => [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, ...mesesHistoricos],
    [dataAtual.mesRef, dataPassado.mesRef, dataRetrasado.mesRef, mesesHistoricos],
  );

  // Colunas visíveis (config do gestor). A ORDEM vem de colunasVisiveis —
  // é ela que o gestor reordena arrastando os headers e que fica salva em
  // gestor_config_fantasia.kpi_colunas_visiveis. KPI_COLUNAS_ORDER serve só
  // para descartar slug desconhecido. O label vem de colunasDisponiveis (já
  // com displayName real do banco, sufixo de unidade removido).
  const headers = useMemo(
    () =>
      colunasVisiveis
        .filter((slug) => (KPI_COLUNAS_ORDER as readonly string[]).includes(slug))
        .map((slug) => ({
          slug,
          displayName: colunasDisponiveis.find((c) => c.slug === slug)?.label ?? slug,
        })),
    [colunasVisiveis, colunasDisponiveis],
  );

  // ── Drag & drop dos headers (HTML5 nativo, sem lib) ──────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de 500ms: num arrasto rápido de várias colunas só a ordem
  // final vai pro banco. Sem toast — o feedback já é o próprio movimento.
  const salvarOrdem = useCallback((ordem: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveKpiColunasAction(ordem).then((r) => {
        if (!r.success) console.error("[kpi-colunas] falha ao salvar ordem:", r.error);
      });
    }, 500);
  }, []);

  const limparDrag = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // Índices são relativos a `headers` (só colunas de KPI) — a coluna
  // "Operador" é um <th> separado e nunca entra no drag.
  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const ordemAtual = headers.map((h) => h.slug);
      if (
        Number.isNaN(fromIndex) ||
        fromIndex < 0 ||
        fromIndex >= ordemAtual.length ||
        toIndex < 0 ||
        toIndex >= ordemAtual.length
      ) {
        return;
      }
      const nova = [...ordemAtual];
      const [movido] = nova.splice(fromIndex, 1);
      nova.splice(toIndex, 0, movido);
      setColunasVisiveis(nova);
      salvarOrdem(nova);
    },
    [headers, salvarOrdem],
  );

  // Meses ANTIGOS (passado/retrasado/históricos) chegam com toda célula
  // "neutral" (get-kpi-equipe-gestor.ts/toKpiEquipeSerial, lib/kpi/gestor/*,
  // não alterados) — recoloridos aqui no client com a MESMA lógica/fonte do
  // mês atual (ver _lib/status-historico.ts). Mês atual não passa por aqui:
  // já vem com status calculado no servidor.
  //
  // Parte de `dataExibida` (não de `data`/`mesSelecionado`) de propósito: a
  // tabela pode estar mostrando o mês ANTERIOR ainda (com opacity reduzida)
  // enquanto o mês recém-selecionado carrega (ver dataExibida acima) — a
  // decisão de recolorir tem que refletir de qual mês os operadores
  // exibidos REALMENTE são, não o mês alvo da seleção.
  const operadoresBase = useMemo(() => {
    const operadores = dataExibida?.operadores ?? [];
    const ehMesAtualDaTabelaExibida = dataExibida?.mesRef === dataAtual.mesRef;
    if (ehMesAtualDaTabelaExibida) return operadores;
    return recolorirOperadoresHistorico(operadores, kpiDefinitions);
  }, [dataExibida, dataAtual.mesRef, kpiDefinitions]);

  const operadoresParaTela = useMemo(() => {
    // olhoAberto=true → revelar nomes reais (slug derivado do email)
    // olhoAberto=false → mostrar nome fantasia (já em op.nome, resolvido no server)
    if (!nomeFantasia?.ativo || olhoAberto) return operadoresBase;
    return operadoresBase.map((op) => ({
      ...op,
      nome: deriveNomeOperador(op.email),
    }));
  }, [operadoresBase, nomeFantasia, olhoAberto]);

  // op.kpis passa a ser SÓ as colunas visíveis (combinando principais +
  // secundárias) — tabela na tela e exportação PNG usam a mesma seleção.
  const operadoresParaTabela = useMemo(
    () => aplicarColunasVisiveis(operadoresParaTela, headers),
    [operadoresParaTela, headers],
  );

  // Export SEMPRE usa nome fantasia (ou o fallback já embutido em
  // resolverNomeExibicao/deriveNomeOperador quando não há apelido
  // cadastrado) — nunca o nome real, mesmo que o gestor esteja com o
  // "olho" aberto revelando nomes reais na tela no momento do clique.
  // Por isso parte de `operadoresBase` (já recolorido, mas ainda sem o
  // toggle de nome fantasia aplicado), não de `operadoresParaTela`.
  const operadoresParaExport = useMemo(
    () => aplicarColunasVisiveis(operadoresBase, headers),
    [operadoresBase, headers],
  );

  const scopeAtual = scopeParaMes(mesSelecionado);
  const rvDataAtual = rvCache[mesSelecionado] ?? null;
  // Coluna (tela + print) só aparece com a preferência ligada E o mês atual
  // suportando RV — rvVisivel (a preferência salva) não muda quando o mês
  // muda, só a renderização.
  const rvColunaAtiva = rvVisivel && !!scopeAtual;

  // "Retenção (dd/mm)" — sempre ativa no mês atual, sem toggle;
  // não renderizada em meses históricos (reaproveita scopeAtual, mesma regra
  // de "mês atual" que o RV já usa).
  const mostrarColunaUltimoReport = !!scopeAtual;

  // RvCalculation.normal (RV sempre exibido sem contestação nesta página) —
  // mesma fonte (rvDataAtual, já calculada por getRvParaEquipe/calculateRv),
  // não uma consulta nova. Base de TODAS as colunas de RV (sort e render).
  // Estabilizada com useCallback (deps: scopeAtual, rvDataAtual) — não
  // dispara nenhum fetch, só lê rvDataAtual já carregado, então pode entrar
  // nas deps das 6 funções de sort abaixo sem risco de loop.
  const getRvCalculo = useCallback(
    (email: string): RvCalculation | null => {
      if (!scopeAtual || !rvDataAtual) return null;
      const resultado = rvDataAtual.porOperador[email.trim().toLowerCase()];
      return resultado?.normal ?? null;
    },
    [scopeAtual, rvDataAtual],
  );

  const getIndispRvValorParaSort = useCallback(
    (email: string): number | null => {
      const r = getRvCalculo(email)?.binaryResults.find((x) => x.indicator.slug === INDISP_RV_INDICATOR_SLUG);
      return r && r.valorAtual !== null ? r.valorGanho : null;
    },
    [getRvCalculo],
  );

  const getTmaRvValorParaSort = useCallback(
    (email: string): number | null => {
      const r = getRvCalculo(email)?.binaryResults.find((x) => x.indicator.slug === TMA_RV_INDICATOR_SLUG);
      return r && r.valorAtual !== null ? r.valorGanho : null;
    },
    [getRvCalculo],
  );

  // Sort do Bônus: mesma regra de "sem dado" da célula — só entra no valor
  // (pra ordenar) quando todas as condições têm valor (nenhuma null).
  const getBonusRvValorParaSort = useCallback(
    (email: string): number | null => {
      const bonus = getRvCalculo(email)?.combinedBonusResults[0];
      if (!bonus) return null;
      const faltaAlgumValor = bonus.conditionResults.some((c) => c.valorAtual === null);
      return faltaAlgumValor ? null : bonus.valorGanho;
    },
    [getRvCalculo],
  );

  // Sort do Multiplicador: mesma regra de "sem dado" da célula (txAtual null).
  const getMultiplicadorRvValorParaSort = useCallback(
    (email: string): number | null => {
      const r = getRvCalculo(email)?.perUnitResults.find((x) => x.indicator.slug === MULTIPLICADOR_RETIDO_INDICATOR_SLUG);
      return r && r.txAtual !== null ? r.valorGanho : null;
    },
    [getRvCalculo],
  );

  // Sort do Ticket: mesma regra de "sem dado" da célula (valorAtual null).
  const getTicketRvValorParaSort = useCallback(
    (email: string): number | null => {
      const r = getRvCalculo(email)?.tieredResults.find((x) => x.indicator.slug === TICKET_INDICATOR_SLUG);
      return r && r.valorAtual !== null ? r.valorGanho : null;
    },
    [getRvCalculo],
  );

  // Sort do RV Total: só operadores com cálculo "ok" entram no valor —
  // inelegível/indisponível/sem dado vão pro fim (null), mesma regra das
  // demais colunas de RV.
  const getRvTotalValorParaSort = useCallback(
    (email: string): number | null => {
      const calculo = getRvCalculo(email);
      return calculo?.status === "ok" ? calculo.liquido : null;
    },
    [getRvCalculo],
  );

  const sortedOps = useMemo(
    () =>
      applySortToOperadores(
        operadoresParaTabela,
        sort,
        kpiAnterior,
        getIndispRvValorParaSort,
        getTmaRvValorParaSort,
        getBonusRvValorParaSort,
        getMultiplicadorRvValorParaSort,
        getTicketRvValorParaSort,
        getRvTotalValorParaSort,
      ),
    [
      operadoresParaTabela,
      sort,
      kpiAnterior,
      getIndispRvValorParaSort,
      getTmaRvValorParaSort,
      getBonusRvValorParaSort,
      getMultiplicadorRvValorParaSort,
      getTicketRvValorParaSort,
      getRvTotalValorParaSort,
    ],
  );

  // Print precisa refletir a MESMA ordem da tela no momento da captura —
  // mesma função e mesmo `sort` de sortedOps, não uma ordenação própria.
  const operadoresParaExportOrdenados = useMemo(
    () =>
      applySortToOperadores(
        operadoresParaExport,
        sort,
        kpiAnterior,
        getIndispRvValorParaSort,
        getTmaRvValorParaSort,
        getBonusRvValorParaSort,
        getMultiplicadorRvValorParaSort,
        getTicketRvValorParaSort,
        getRvTotalValorParaSort,
      ),
    [
      operadoresParaExport,
      sort,
      kpiAnterior,
      getIndispRvValorParaSort,
      getTmaRvValorParaSort,
      getBonusRvValorParaSort,
      getMultiplicadorRvValorParaSort,
      getTicketRvValorParaSort,
      getRvTotalValorParaSort,
    ],
  );

  // ── Export PNG (CopyKpiButton) ───────────────────────────────────────
  // A instância offscreen (data-kpi-tabela-png) só existe montada durante a
  // captura — não fica sempre no DOM. `exportAtivo` controla essa
  // montagem; `capturarTabelaPng` é passada ao CopyKpiButton como
  // `onCapturar` e cuida do ciclo inteiro: monta → aguarda fontes/frames →
  // captura → desmonta (inclusive em erro, via finally).
  const [exportAtivo, setExportAtivo] = useState(false);

  const capturarTabelaPng = useCallback(async (): Promise<string> => {
    setExportAtivo(true);
    try {
      // Aguarda o commit do React (a instância offscreen precisa estar no
      // DOM antes de ser consultada) — 2 frames pra garantir que o
      // navegador já pintou com o novo estado antes de seguir.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const target = document.querySelector<HTMLElement>("[data-kpi-tabela-png]");
      if (!target) throw new Error("Tabela offscreen não encontrada para captura");

      // Fontes carregadas + 2 frames de respiro (layout/paint estáveis)
      // antes de capturar — evita capturar com a fonte ainda no fallback.
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      return await capturarComoPng(target);
    } finally {
      setExportAtivo(false);
    }
  }, []);

  return (
    <section className="space-y-4">
      <div>
        {/* Cabeçalho — Linha 1: só título + subtítulo (ações foram pra linha do seletor de mês) */}
        <div className="pt-4">
          <h1
            className={cn(
              "font-sans text-3xl tracking-tight text-foreground md:text-4xl",
              TITULO_WEIGHT_CLASS,
            )}
          >
            Operadores
          </h1>
          {/* Respiro título→subtítulo via margin (pt-3 = 12px), não line-height. */}
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {nomeGestor}
            <SubtituloSeparador />
            {formatMesCapitalizado(data?.mesRef ?? mesSelecionado)}
            {data?.dataCorte && (
              <>
                <SubtituloSeparador />
                {`Dados até ${formatDateBR(data.dataCorte).slice(0, 5)}`}
              </>
            )}
          </p>
        </div>

        {/*
          Seletor de mês (esquerda) + ações RV/Copiar imagem (direita),
          centralizados verticalmente entre si. Em telas estreitas, o grupo
          de ações quebra pra linha de baixo (flex-wrap) e continua alinhado
          à direita nela (ml-auto funciona por linha, mesmo com wrap).
        */}
        <div className="flex flex-wrap items-center gap-3 pt-4 pb-4">
          <MesSelector
            meses={todosMeses}
            mesSelecionado={mesSelecionado}
            onChange={handleMesChange}
            carregandoMes={carregandoMes}
          />

          {data && data.operadores.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {/*
                Switch sempre visível (mesmo fora do mês atual) — desabilitado
                com tooltip nesse caso. rvVisivel (preferência salva) não é
                tocado por isso, só a capacidade de interagir.
              */}
              <RvSwitch
                checked={rvVisivel}
                onCheckedChange={handleToggleRv}
                disabled={!scopeAtual}
                disabledTooltip={!scopeAtual ? "RV disponível só no mês atual" : undefined}
              />

              {/*
                Seletor "RV normal / RV com contestação" removido desta
                página (pedido explícito) — o RV exibido é sempre o normal.
                Mantém só o spinner de carregamento, com o mesmo fade de
                entrada/saída de antes.
              */}
              <AnimatePresence initial={false}>
                {rvVisivel && scopeAtual && carregandoRv === mesSelecionado && (
                  <motion.div
                    key="rv-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex shrink-0 items-center"
                  >
                    <IconLoader2
                      size={14}
                      className="animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <CopyKpiButton
                dataCorte={data.dataCorte}
                comAvisoRv={rvColunaAtiva}
                onCapturar={capturarTabelaPng}
              />
            </div>
          )}
        </div>

        {/*
          Seção da tabela — sem linha divisória (removida antes; o
          espaçamento entre o seletor de mês e as cantoneiras da tabela vem
          só do gap vertical: pb-4 da linha acima + pt-4 daqui = 32px).
        */}
        <div className="pt-4 relative">
          {semTabelaAnterior ? (
            // Edge case: loading do mês selecionado sem nenhuma tabela
            // anterior pra manter em tela — skeleton com as mesmas colunas.
            <KpiTabelaSkeleton headers={headers} />
          ) : !dataExibida || dataExibida.operadores.length === 0 ? (
            // Vazio/erro/"sem importação do mês" — moldura local (cantoneiras
            // do KpiFrame), sem StyledCard (sem shadow-zinc-950/5 nesta rota).
            <KpiEmptyState
              mensagem={`Nenhum dado encontrado para ${formatMesPorExtenso(mesSelecionado)}.`}
            />
          ) : (
            <>
              {dataExibida.dataCorte === null && (
                <p className="ds-small text-muted-foreground mb-3">
                  Nenhum dado importado para {formatMesPorExtenso(dataExibida.mesRef)} ainda —
                  a equipe abaixo é a mesma do último mês com dados.
                </p>
              )}
              {/*
                Troca de mês sem flash: enquanto o mês SELECIONADO ainda está
                carregando (isLoadingAtual), a tabela do mês anterior
                continua renderizada aqui, só com opacity reduzida e
                pointer-events desligado — nunca some/esvazia. Quando os
                dados novos chegam, a troca é direta (sem animação de
                saída): dataExibida já reflete o novo mês e a opacity volta
                a 1 no mesmo re-render.
              */}
              <div
                className={cn(
                  "transition-opacity duration-150 ease-out",
                  isLoadingAtual ? "pointer-events-none opacity-50" : "opacity-100",
                )}
              >
                <KpiOperadoresTabela
                  operadores={sortedOps}
                  headers={headers}
                  sort={sort}
                  rvColunaAtiva={rvColunaAtiva}
                  mostrarToggleOlho={!!nomeFantasia?.ativo}
                  olhoAberto={olhoAberto}
                  onToggleOlho={handleToggleOlho}
                  onSort={handleSort}
                  mostrarColunaUltimoReport={mostrarColunaUltimoReport}
                  kpiAnterior={kpiAnterior}
                  getRvCalculo={getRvCalculo}
                  dragIndex={dragIndex}
                  dragOverIndex={dragOverIndex}
                  onHeaderDragStart={setDragIndex}
                  onHeaderDragEnter={setDragOverIndex}
                  onHeaderDragLeave={(e, idx) => {
                    // dragleave também dispara ao passar sobre filhos
                    // (span/ícone) — só limpa se saiu mesmo do <th>.
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverIndex((atual) => (atual === idx ? null : atual));
                  }}
                  onHeaderDrop={(fromIndex, toIndex) => {
                    handleReorder(fromIndex, toIndex);
                    limparDrag();
                  }}
                  onHeaderDragEnd={limparDrag}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* OperatorDetailModal não é mais renderizado (nome do operador não é
          mais clicável) — componente mantido no arquivo, só não é chamado. */}

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG (CopyKpiButton). Vive
        off-screen pra não afetar o layout. Renderiza o MESMO
        KpiOperadoresTabela do site (mesmas cantoneiras/KpiFrame, mesmos
        tokens) — nada de template hardcoded à parte, pra imagem exportada
        sair idêntica ao que está na tela, nos dois temas.

        Só fica montada durante a captura (exportAtivo, controlado por
        capturarTabelaPng/CopyKpiButton) — não vive sempre no DOM como
        antes. onSort ausente mantém a instância estática (sem
        drag/clique), e sem o fade de scroll da tabela interativa (a
        máscara não é aplicada aqui — ver buildScrollFadeMask/`interativo`
        em KpiOperadoresTabela).

        Usa `operadoresParaExportOrdenados` (derivado de data.operadores,
        não de operadoresParaTela) de propósito: a imagem exportada sempre
        mostra nome fantasia, nunca o nome real — mesmo que o gestor esteja
        com o "olho" aberto revelando nomes reais na tela no momento do
        clique.
      */}
      {exportAtivo && data && data.operadores.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
          }}
        >
          <div data-kpi-tabela-png data-page="kpi-operadores">
            <KpiOperadoresTabela
              operadores={operadoresParaExportOrdenados}
              headers={headers}
              sort={sort}
              rvColunaAtiva={rvColunaAtiva}
              mostrarColunaUltimoReport={mostrarColunaUltimoReport}
              kpiAnterior={kpiAnterior}
              getRvCalculo={getRvCalculo}
            />
          </div>
        </div>
      )}
    </section>
  );
}
