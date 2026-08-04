"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconX,
  IconSelector,
  IconChevronUp,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconUsersGroup,
} from "@tabler/icons-react";

import { ConfigKpiPopover, type ColunaKpiDisponivel } from "@/components/gestor/config-kpi-popover";
import { StyledCard } from "@/components/gestor/styled-card";
import { CopyKpiButton } from "@/components/operacional/copy-kpi-button";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { KPI_COLUNAS_ORDER } from "@/lib/kpi/gestor/kpi-colunas-config";
import type {
  KpiCelulaSerial,
  KpiEquipeSerial,
  OperadorKpiSerial,
} from "@/lib/kpi/gestor/serial-types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";

type Mes = "atual" | "passado" | "retrasado";
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

interface OperatorDetailModalProps {
  operador: OperadorKpiSerial;
  isMesPassado: boolean;
  onClose: () => void;
}

function SecondaryKpiCard({ kpi, isMesPassado }: { kpi: KpiCelulaSerial; isMesPassado: boolean }) {
  const status = kpi.status;
  const isVariation = kpi.valueType === "percent_negative";

  const hasStatusColor = !isMesPassado && !isVariation && status !== "neutral";
  let statusColor = "var(--muted-foreground)";
  if (hasStatusColor) {
    if (status === "success") statusColor = "var(--success)";
    else if (status === "warning") statusColor = "var(--warning)";
    else if (status === "danger") statusColor = "var(--danger)";
  }

  const valueColor = hasStatusColor ? statusColor : "var(--foreground)";

  return (
    <div className="elevation-1 relative overflow-hidden rounded-lg p-5 border border-border/50 bg-muted/10">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background: hasStatusColor ? statusColor : "var(--muted-foreground)",
        }}
      />
      <p className="ds-small text-muted-foreground mb-1.5 tracking-wider uppercase font-semibold text-[10px]">
        {kpi.displayName}
      </p>
      <p
        className="ds-display font-semibold"
        style={{
          fontSize: "1.75rem",
          color: valueColor,
        }}
      >
        {kpi.valor === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatKpiValue(kpi.valor, kpi.valueType)
        )}
      </p>
    </div>
  );
}

// Não renderizado atualmente (nome do operador não é mais clicável) —
// mantido de propósito para uma eventual reativação futura.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OperatorDetailModal({
  operador,
  isMesPassado,
  onClose,
}: OperatorDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "color-mix(in oklch, var(--background) 80%, transparent)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="elevation-3 w-full max-w-3xl rounded-xl p-6"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {operador.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="ds-h2 font-semibold text-lg leading-none">
                  {operador.nome}
                </h2>
                <p className="ds-mono-sm text-muted-foreground text-xs mt-1">
                  KPIs Secundários · {isMesPassado ? "Mês Passado (Neutro)" : "Mês Atual"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <IconX size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {operador.secundarios.map((kpi) => (
              <SecondaryKpiCard
                key={kpi.slug}
                kpi={kpi}
                isMesPassado={isMesPassado}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Nome da CSS var de status — null quando não há cor a aplicar (neutro/nulo/mês passado). */
function statusColorVar(
  kpi: KpiCelulaSerial,
  isMesPassado: boolean,
): string | null {
  if (isMesPassado || kpi.status === "neutral" || kpi.valor === null) return null;
  if (kpi.status === "success") return "--success";
  if (kpi.status === "warning") return "--warning";
  return "--danger";
}

function celulaStyle(
  kpi: KpiCelulaSerial,
  isMesPassado: boolean,
): React.CSSProperties {
  const v = statusColorVar(kpi, isMesPassado);
  if (!v) return {};
  return {
    color: `var(${v})`,
    fontWeight: 600,
  };
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

/* ────────────────────────────────────────────────────────────────────
   PNG offscreen — capturado por CopyKpiButton via [data-kpi-tabela-png].
   SÓ a tabela (sem título/subtítulo — esses vão como texto no clipboard,
   via buildClipboardReportHtml, mesmo padrão do Consolidado/Tempo
   Logado/Indisponibilidade). Fundo branco fixo, texto sempre preto (sem
   cores de meta), zebra nas linhas.
   ──────────────────────────────────────────────────────────────────── */

const PNG_SANS_STACK = "'Segoe UI', 'Arial', sans-serif";
const PNG_HEADER_BG = "#1f4e78";
const PNG_HEADER_DIVIDER = "#4a7ba6";
const PNG_BORDER = "#d0d0d0";
const PNG_ZEBRA_IMPAR = "#ffffff";
const PNG_ZEBRA_PAR = "#f8f8f8";

const PNG_CELL_PADDING = "12px 24px";
const PNG_COL_MIN_WIDTH = 120;

function KpiTablePng({
  operadores,
  headers,
}: {
  operadores: OperadorKpiSerial[];
  headers: { slug: string; displayName: string }[];
}) {
  return (
    <table
      style={{
        borderCollapse: "collapse",
        tableLayout: "auto",
        width: "auto",
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #c0c0c0",
        fontFamily: PNG_SANS_STACK,
      }}
    >
      <thead>
        <tr style={{ background: PNG_HEADER_BG }}>
          <th
            style={{
              padding: PNG_CELL_PADDING,
              minWidth: PNG_COL_MIN_WIDTH,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#ffffff",
              textAlign: "center",
              whiteSpace: "nowrap",
              borderRight: `1px solid ${PNG_HEADER_DIVIDER}`,
            }}
          >
            Operador
          </th>
          {headers.map((h, idx) => (
            <th
              key={h.slug}
              style={{
                padding: PNG_CELL_PADDING,
                minWidth: PNG_COL_MIN_WIDTH,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#ffffff",
                textAlign: "center",
                whiteSpace: "nowrap",
                borderRight: idx < headers.length - 1 ? `1px solid ${PNG_HEADER_DIVIDER}` : undefined,
              }}
            >
              {h.displayName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {operadores.map((op, idx) => (
          <tr
            key={op.email}
            style={{ background: idx % 2 === 0 ? PNG_ZEBRA_IMPAR : PNG_ZEBRA_PAR }}
          >
            <td
              style={{
                padding: PNG_CELL_PADDING,
                minWidth: PNG_COL_MIN_WIDTH,
                fontSize: "12px",
                textAlign: "center",
                color: "#000000",
                borderRight: `1px solid ${PNG_BORDER}`,
                borderTop: `1px solid ${PNG_BORDER}`,
              }}
            >
              {op.nome}
            </td>
            {op.kpis.map((kpi, kIdx) => (
              <td
                key={kpi.slug}
                style={{
                  padding: PNG_CELL_PADDING,
                  minWidth: PNG_COL_MIN_WIDTH,
                  fontSize: "12px",
                  textAlign: "center",
                  color: "#000000",
                  fontVariantNumeric: "tabular-nums",
                  borderTop: `1px solid ${PNG_BORDER}`,
                  borderRight: kIdx < op.kpis.length - 1 ? `1px solid ${PNG_BORDER}` : undefined,
                }}
              >
                {kpi.valor === null ? "—" : formatKpiValue(kpi.valor, kpi.valueType)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface KpiEquipeSectionProps {
  dataAtual: KpiEquipeSerial;
  dataPassado: KpiEquipeSerial;
  dataRetrasado: KpiEquipeSerial;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  colunasDisponiveis: ColunaKpiDisponivel[];
  colunasVisiveisIniciais: string[];
}

export function KpiEquipeSection({
  dataAtual,
  dataPassado,
  dataRetrasado,
  nomeFantasia,
  olhoInicial = false,
  colunasDisponiveis,
  colunasVisiveisIniciais,
}: KpiEquipeSectionProps) {
  const [mes, setMes] = useState<Mes>("atual");
  const [sort, setSort] = useState<SortState>({ slug: "tx_retencao_bruta", dir: "desc" });
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(colunasVisiveisIniciais);
  // Espelha o open/close do ConfigKpiPopover só pra elevar a tabela acima do
  // overlay de blur (z-40) enquanto o popover está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);

  const data =
    mes === "atual" ? dataAtual : mes === "passado" ? dataPassado : dataRetrasado;

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("operacional", novoValor);
  }

  const handleMesChange = (m: Mes) => {
    setMes(m);
    setSort({ slug: "tx_retencao_bruta", dir: "desc" });
  };

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

  // Colunas visíveis (config do gestor) — filtra + ordena KPI_COLUNAS_ORDER
  // pela seleção salva, resolvendo o label a partir de colunasDisponiveis
  // (já vem com displayName real do banco, sufixo de unidade removido).
  const headers = useMemo(
    () =>
      KPI_COLUNAS_ORDER.filter((slug) => colunasVisiveis.includes(slug)).map((slug) => ({
        slug,
        displayName: colunasDisponiveis.find((c) => c.slug === slug)?.label ?? slug,
      })),
    [colunasVisiveis, colunasDisponiveis],
  );

  const operadoresParaTela = useMemo(() => {
    if (!nomeFantasia?.ativo || !olhoAberto) return data.operadores;
    return data.operadores.map((op) => ({
      ...op,
      nome: deriveNomeOperador(op.email),
    }));
  }, [data.operadores, nomeFantasia, olhoAberto]);

  // op.kpis passa a ser SÓ as colunas visíveis (combinando principais +
  // secundárias) — tabela na tela e exportação PNG usam a mesma seleção.
  const operadoresParaTabela = useMemo(
    () => aplicarColunasVisiveis(operadoresParaTela, headers),
    [operadoresParaTela, headers],
  );

  const operadoresParaExport = useMemo(
    () => aplicarColunasVisiveis(data.operadores, headers),
    [data.operadores, headers],
  );

  const sortedOps = useMemo(
    () => applySortToOperadores(operadoresParaTabela, sort),
    [operadoresParaTabela, sort],
  );

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
              - {formatMesRef(data.mesRef)}
              {data.dataCorte && ` · Dados até ${formatDateBR(data.dataCorte)}`}
            </span>
          </div>
        </div>

        {/* Linha abaixo do título: Toggles de mês na ESQUERDA e Copiar como Imagem na EXTREMIDADE DIREITA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["atual", "passado", "retrasado"] as Mes[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMesChange(m)}
                className={[
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer shadow-sm transition-opacity",
                  mes === m
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60",
                ].join(" ")}
                style={{ fontSize: "12px" }}
              >
                {m === "atual"
                  ? "Mês Atual"
                  : m === "passado"
                    ? "Mês Passado"
                    : "Mês Retrasado"}
              </button>
            ))}
          </div>

          {data.operadores.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <CopyKpiButton dataCorte={data.dataCorte} />
              <ConfigKpiPopover
                colunasDisponiveis={colunasDisponiveis}
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
          {data.operadores.length === 0 ? (
            <StyledCard withGradient className="p-8 text-center">
              <p className="ds-body text-muted-foreground">
                Nenhum dado encontrado para {formatMesRef(data.mesRef)}.
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
              <StyledCard withGradient className="p-3">
                <div className="elevation-1 overflow-x-auto rounded-xl border border-border/80 scrollbar-tema">
                <table
                  className="w-full border-collapse text-sm"
                  style={{ minWidth: 860 }}
                >
                  <thead>
                    <tr
                      className="bg-muted/40"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <th
                        className="ds-mono-sm text-muted-foreground sticky left-0 z-20 bg-card px-4 py-2.5 text-center align-middle font-semibold tracking-wider uppercase whitespace-nowrap select-none border-r border-border/50 shadow-sm"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Operador</span>
                          {nomeFantasia?.ativo && (
                            <button
                              type="button"
                              onClick={handleToggleOlho}
                              title={
                                olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"
                              }
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
                          className={[
                            "ds-mono-sm text-muted-foreground px-3 py-2.5 text-center font-semibold tracking-wider uppercase whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors",
                            idx < headers.length - 1 ? "border-r border-border/50" : "",
                          ].join(" ")}
                          onClick={() => handleSort(h.slug)}
                        >
                          {h.displayName}
                          <SortIcon slug={h.slug} sort={sort} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOps.map((op, i) => (
                      <tr
                        key={op.email}
                        className="group hover:bg-muted/10 transition-colors"
                        style={{
                          borderBottom:
                            i < sortedOps.length - 1
                              ? "1px solid var(--border)"
                              : undefined,
                        }}
                      >
                        <td className="ds-body sticky left-0 z-10 bg-card px-4 py-2 text-center align-middle font-medium border-r border-border/30 shadow-sm">
                          {op.nome}
                        </td>
                        {op.kpis.map((kpi, idx) => {
                          const v = statusColorVar(kpi, data.isMesPassado);
                          return (
                            <td
                              key={kpi.slug}
                              className={[
                                "ds-mono-sm px-3 py-2 text-center",
                                idx < op.kpis.length - 1 ? "border-r border-border/30" : "",
                              ].join(" ")}
                              style={celulaStyle(kpi, data.isMesPassado)}
                            >
                              {kpi.valor === null ? (
                                <span className="text-muted-foreground">—</span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </StyledCard>
            </>
          )}
        </div>
      </div>

      {/* OperatorDetailModal não é mais renderizado (nome do operador não é
          mais clicável) — componente mantido no arquivo, só não é chamado. */}

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG (CopyKpiButton).
        Vive off-screen pra não afetar o layout. Usa data.operadores (nome já
        vem com fantasia resolvida no server, se ativa) — nunca a versão do
        olho aberto/revelado da tela.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
        }}
      >
        <div data-kpi-tabela-png>
          <KpiTablePng operadores={operadoresParaExport} headers={headers} />
        </div>
      </div>
    </motion.section>
  );
}
