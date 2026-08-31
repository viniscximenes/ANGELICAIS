"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { motion } from "motion/react";
import {
  IconSelector,
  IconChevronUp,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconUsersGroup,
  IconCoin,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { ConfigKpiPopover, type ColunaKpiDisponivel } from "@/components/gestor/config-kpi-popover";
import { StyledCard } from "@/components/gestor/styled-card";
import { CopyKpiButton } from "@/components/operacional/copy-kpi-button";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import {
  celulaStyle as celulaStyleShared,
  statusColorVar as statusColorVarShared,
} from "@/lib/kpi/atual/status-color";
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
import { formatBRL } from "@/lib/rv/format-money";
import type { RvEquipeResultado } from "@/lib/rv/get-rv-para-equipe";
import type { RvScope } from "@/lib/rv/types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";

type RvModo = "normal" | "contestacao";

type SortDir = "asc" | "desc";
type SortState = { slug: string; dir: SortDir };

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

// Coloração das células vem de @/lib/kpi/atual/status-color (fonte única,
// compartilhada com a tabela de /operacao/kpi-detalhado). Wrappers finos
// aqui só pra manter a assinatura `(kpi, isMesPassado)` dos call sites.
function statusColorVar(kpi: KpiCelulaSerial, isMesPassado: boolean): string | null {
  return statusColorVarShared(kpi.status, kpi.valor === null, isMesPassado);
}

function celulaStyle(
  kpi: KpiCelulaSerial,
  isMesPassado: boolean,
): React.CSSProperties {
  return celulaStyleShared(kpi.status, kpi.valor === null, isMesPassado);
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

function applySortToOperadores(
  operadores: OperadorKpiSerial[],
  sort: SortState,
): OperadorKpiSerial[] {
  return [...operadores].sort((a, b) => {
    const va = a.kpis.find((k) => k.slug === sort.slug)?.valor ?? null;
    const vb = b.kpis.find((k) => k.slug === sort.slug)?.valor ?? null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return sort.dir === "desc" ? vb - va : va - vb;
  });
}

function SortIcon({ slug, sort }: { slug: string; sort: SortState }) {
  if (sort.slug !== slug) {
    return (
      <IconSelector size={14} className="ml-1 inline-block opacity-40 align-middle" aria-hidden="true" />
    );
  }
  return sort.dir === "asc" ? (
    <IconChevronUp size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
  ) : (
    <IconChevronDown size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
  );
}

function rvTituloColuna(modo: RvModo): string {
  return modo === "normal" ? "RV (SEM CONTESTAÇÃO)" : "RV (CONTESTADO ABS E INDISP)";
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
  isMesPassado,
  sort,
  rvColunaAtiva,
  rvModo,
  getRvLiquido,
  mostrarToggleOlho,
  olhoAberto,
  onToggleOlho,
  onSort,
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
  isMesPassado: boolean;
  sort: SortState;
  rvColunaAtiva: boolean;
  rvModo: RvModo;
  getRvLiquido: (email: string) => number | null;
  mostrarToggleOlho?: boolean;
  olhoAberto?: boolean;
  onToggleOlho?: () => void;
  /** Presente = tabela interativa (tela); ausente = instância estática (export). */
  onSort?: (slug: string) => void;
  dragIndex?: number | null;
  dragOverIndex?: number | null;
  onHeaderDragStart?: (idx: number) => void;
  onHeaderDragEnter?: (idx: number) => void;
  onHeaderDragLeave?: (e: DragEvent<HTMLTableCellElement>, idx: number) => void;
  onHeaderDrop?: (fromIndex: number, toIndex: number) => void;
  onHeaderDragEnd?: () => void;
}) {
  const interativo = !!onSort;

  return (
    <StyledCard withGradient className="p-3">
      <div className="elevation-1 overflow-x-auto rounded-xl border border-border/80 scrollbar-tema">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead>
            <tr className="bg-muted/40" style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="ds-mono-sm text-muted-foreground sticky left-0 z-20 bg-card px-4 py-2.5 text-center align-middle font-semibold tracking-wider uppercase whitespace-nowrap select-none border-r border-border/50 shadow-sm">
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

              {headers.map((h, idx) => (
                <th
                  key={h.slug}
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
                    "ds-mono-sm text-muted-foreground px-3 py-2.5 text-center font-semibold tracking-wider uppercase whitespace-nowrap select-none",
                    interativo &&
                      "hover:text-foreground transition-colors cursor-grab active:cursor-grabbing",
                    idx < headers.length - 1 ? "border-r border-border/50" : "",
                    dragIndex === idx && "opacity-50",
                    dragOverIndex !== null &&
                      dragOverIndex === idx &&
                      dragIndex !== idx &&
                      (dragIndex !== null && dragIndex < idx
                        ? "border-r-2 border-r-primary"
                        : "border-l-2 border-l-primary"),
                  )}
                  onClick={interativo ? () => onSort?.(h.slug) : undefined}
                >
                  {h.displayName}
                  {interativo && <SortIcon slug={h.slug} sort={sort} />}
                </th>
              ))}
              {rvColunaAtiva && (
                <th className="ds-mono-sm text-muted-foreground px-3 py-2.5 text-center font-semibold tracking-wider uppercase whitespace-nowrap select-none border-l border-border/50">
                  {rvTituloColuna(rvModo)}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {operadores.map((op, i) => (
              <tr
                key={op.email}
                className="group hover:bg-muted/10 transition-colors"
                style={{
                  borderBottom:
                    i < operadores.length - 1 ? "1px solid var(--border)" : undefined,
                }}
              >
                <td className="ds-body sticky left-0 z-10 bg-card px-4 py-2 text-center align-middle font-medium border-r border-border/30 shadow-sm">
                  {op.nome}
                </td>
                {op.kpis.map((kpi, idx) => {
                  const v = statusColorVar(kpi, isMesPassado);
                  return (
                    <td
                      key={kpi.slug}
                      className={[
                        "ds-mono-sm px-3 py-2 text-center",
                        idx < op.kpis.length - 1 ? "border-r border-border/30" : "",
                      ].join(" ")}
                      style={celulaStyle(kpi, isMesPassado)}
                    >
                      {kpi.valor === null ? (
                        <span className="text-muted-foreground">N/D</span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatKpiValue(kpi.valor, kpi.valueType)}
                          </span>
                          {v && (
                            <span
                              aria-hidden="true"
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: `var(${v})` }}
                            />
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
                {rvColunaAtiva && (
                  <td
                    className="ds-mono-sm px-3 py-2 text-center border-l border-border/30"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {(() => {
                      const liquido = getRvLiquido(op.email);
                      return liquido === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatBRL(liquido)}
                        </span>
                      );
                    })()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StyledCard>
  );
}

interface KpiEquipeSectionProps {
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
}

export function KpiEquipeSection({
  dataAtual,
  dataPassado,
  dataRetrasado,
  mesesHistoricos,
  nomeFantasia,
  olhoInicial = false,
  colunasDisponiveis,
  colunasVisiveisIniciais,
  showRvInicial = false,
}: KpiEquipeSectionProps) {
  const [mesSelecionado, setMesSelecionado] = useState<string>(dataAtual.mesRef);
  // Cache dos meses históricos já buscados (getKpiMesHistoricoAction) — evita
  // rebuscar ao alternar de volta pra um mês já visitado nesta sessão.
  const [historicoCache, setHistoricoCache] = useState<Record<string, KpiEquipeSerial>>({});
  const [carregandoMes, setCarregandoMes] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ slug: "tx_retencao_bruta", dir: "desc" });
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(colunasVisiveisIniciais);
  // Espelha o open/close do ConfigKpiPopover só pra elevar a tabela acima do
  // overlay de blur (z-40) enquanto o popover está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);

  // ── RV (geral, mensal) ────────────────────────────────────────────
  // rvVisivel persiste por gestor (show_rv_operadores); rvModo é só de
  // sessão — sempre volta pra "Normal" no F5/login (decisão explícita).
  const [rvVisivel, setRvVisivel] = useState(showRvInicial);
  const [rvModo, setRvModo] = useState<RvModo>("normal");
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
          toast.error(result.error);
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
            toast.error(result.error);
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

  // Lista do popover na ordem atual: as visíveis primeiro (na ordem que o
  // gestor arrastou), depois as ocultas na ordem canônica.
  const colunasDisponiveisOrdenadas = useMemo(() => {
    const porSlug = new Map(colunasDisponiveis.map((c) => [c.slug, c]));
    const visiveis = colunasVisiveis
      .map((slug) => porSlug.get(slug))
      .filter((c): c is ColunaKpiDisponivel => c !== undefined);
    const ocultas = colunasDisponiveis.filter((c) => !colunasVisiveis.includes(c.slug));
    return [...visiveis, ...ocultas];
  }, [colunasDisponiveis, colunasVisiveis]);

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

  const operadoresParaTela = useMemo(() => {
    const operadores = data?.operadores ?? [];
    // olhoAberto=true → revelar nomes reais (slug derivado do email)
    // olhoAberto=false → mostrar nome fantasia (já em op.nome, resolvido no server)
    if (!nomeFantasia?.ativo || olhoAberto) return operadores;
    return operadores.map((op) => ({
      ...op,
      nome: deriveNomeOperador(op.email),
    }));
  }, [data, nomeFantasia, olhoAberto]);

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
  // Por isso parte de `data.operadores` (bruto, resolvido no server),
  // não de `operadoresParaTela` (que segue o toggle do olho).
  const operadoresParaExport = useMemo(
    () => aplicarColunasVisiveis(data?.operadores ?? [], headers),
    [data, headers],
  );

  const sortedOps = useMemo(
    () => applySortToOperadores(operadoresParaTabela, sort),
    [operadoresParaTabela, sort],
  );

  // Print precisa refletir a MESMA ordem da tela no momento da captura —
  // mesma função e mesmo `sort` de sortedOps, não uma ordenação própria.
  const operadoresParaExportOrdenados = useMemo(
    () => applySortToOperadores(operadoresParaExport, sort),
    [operadoresParaExport, sort],
  );

  const scopeAtual = scopeParaMes(mesSelecionado);
  const rvDataAtual = rvCache[mesSelecionado] ?? null;
  // Coluna (tela + print) só aparece com a preferência ligada E o mês atual
  // suportando RV — rvVisivel (a preferência salva) não muda quando o mês
  // muda, só a renderização.
  const rvColunaAtiva = rvVisivel && !!scopeAtual;

  // Reaproveitado pela tela e pela exportação (KpiOperadoresTabela) — mesmo
  // valor, mesmo modo (Normal/Contestação) selecionado no momento da leitura.
  function getRvLiquido(email: string): number | null {
    if (!scopeAtual || !rvDataAtual) return null;
    const resultado = rvDataAtual.porOperador[email.trim().toLowerCase()];
    if (!resultado) return null;
    const calculo = rvModo === "normal" ? resultado.normal : resultado.contestacao;
    return calculo.liquido;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div>
        {/* Header row com título da Equipe */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <h2 className="ds-h2 flex items-center gap-2">
              <IconUsersGroup
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              Equipe
            </h2>
            <span className="ds-mono-sm text-foreground/80 font-medium">
              - {formatMesRef(data?.mesRef ?? mesSelecionado)}
              {data?.dataCorte && ` · Dados até ${formatDateBR(data.dataCorte)}`}
            </span>
          </div>
        </div>

        {/* Linha abaixo do título: Toggles de mês na ESQUERDA e Copiar como Imagem na EXTREMIDADE DIREITA */}
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

          {data && data.operadores.length > 0 && (
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
              {/*
                RV só existe pra Mês Atual (current) e Mês Passado (previous)
                — não é só desabilitar em outros meses, o controle inteiro
                some (scopeAtual null). rvVisivel (a preferência salva) não
                é tocado aqui, só a renderização — ao voltar pra um mês
                suportado, o toggle reaparece do jeito que estava.
              */}
              {scopeAtual && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleRv}
                    aria-pressed={rvVisivel}
                    className={cn(
                      "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
                      rvVisivel
                        ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
                    )}
                    style={{ fontSize: "12px" }}
                  >
                    <IconCoin size={14} aria-hidden="true" />
                    <span>Exibir RV</span>
                  </button>

                  {rvVisivel && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRvModo("normal")}
                        className={cn(
                          "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
                          rvModo === "normal"
                            ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
                        )}
                        style={{ fontSize: "12px" }}
                      >
                        <span>RV Normal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRvModo("contestacao")}
                        className={cn(
                          "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
                          rvModo === "contestacao"
                            ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
                        )}
                        style={{ fontSize: "12px" }}
                      >
                        <span>RV com Contestação</span>
                      </button>
                      {carregandoRv === mesSelecionado && (
                        <IconLoader2
                          size={14}
                          className="animate-spin text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </>
              )}

              <CopyKpiButton dataCorte={data.dataCorte} />
              <ConfigKpiPopover
                colunasDisponiveis={colunasDisponiveisOrdenadas}
                colunasIniciais={colunasVisiveis}
                onSaved={setColunasVisiveis}
                onOpenChange={setConfigPopoverOpen}
              />
            </div>
          )}
        </div>

        {/* Divisória + Seção da Tabela dentro de StyledCard */}
        <div
          className={cn(
            "border-t border-dashed border-border pt-4 relative transition-[z-index] duration-0",
            configPopoverOpen && "z-[45]",
          )}
        >
          {carregandoMes === mesSelecionado ? (
            <StyledCard withGradient className="p-8 text-center flex items-center justify-center gap-2">
              <IconLoader2 size={16} className="animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="ds-body text-muted-foreground">
                Carregando {formatMesRef(mesSelecionado)}...
              </p>
            </StyledCard>
          ) : !data || data.operadores.length === 0 ? (
            <StyledCard withGradient className="p-8 text-center">
              <p className="ds-body text-muted-foreground">
                Nenhum dado encontrado para {formatMesRef(mesSelecionado)}.
              </p>
            </StyledCard>
          ) : (
            <>
              {data.dataCorte === null && (
                <p className="ds-small text-muted-foreground mb-3">
                  Nenhum dado importado para {formatMesRef(data.mesRef)} ainda — a
                  equipe abaixo é a mesma do último mês com dados.
                </p>
              )}
              <KpiOperadoresTabela
                operadores={sortedOps}
                headers={headers}
                isMesPassado={data.isMesPassado}
                sort={sort}
                rvColunaAtiva={rvColunaAtiva}
                rvModo={rvModo}
                getRvLiquido={getRvLiquido}
                mostrarToggleOlho={!!nomeFantasia?.ativo}
                olhoAberto={olhoAberto}
                onToggleOlho={handleToggleOlho}
                onSort={handleSort}
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
            </>
          )}
        </div>
      </div>

      {/* OperatorDetailModal não é mais renderizado (nome do operador não é
          mais clicável) — componente mantido no arquivo, só não é chamado. */}

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG (CopyKpiButton). Vive
        off-screen pra não afetar o layout. Renderiza o MESMO
        KpiOperadoresTabela do site (mesmo StyledCard com as cantoneiras,
        mesmos tokens) — nada de template hardcoded à parte, pra imagem
        exportada sair idêntica ao que está na tela, nos dois temas.

        Usa `operadoresParaExportOrdenados` (derivado de data.operadores,
        não de operadoresParaTela) de propósito: a imagem exportada sempre
        mostra nome fantasia, nunca o nome real — mesmo que o gestor esteja
        com o "olho" aberto revelando nomes reais na tela no momento do
        clique. Sem passar onSort, a instância fica estática (sem
        drag/clique) — mesma aparência, sem interatividade que não faz
        sentido numa captura.
      */}
      {data && data.operadores.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
          }}
        >
          <div data-kpi-tabela-png>
            <KpiOperadoresTabela
              operadores={operadoresParaExportOrdenados}
              headers={headers}
              isMesPassado={data.isMesPassado}
              sort={sort}
              rvColunaAtiva={rvColunaAtiva}
              rvModo={rvModo}
              getRvLiquido={getRvLiquido}
            />
          </div>
        </div>
      )}
    </motion.section>
  );
}
