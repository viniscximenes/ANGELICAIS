"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconFilterFilled,
  IconSearch,
  IconSelector,
} from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { celulaStyle, statusColorVar } from "@/lib/kpi/atual/status-color";
import type { KpiDetalhadoData } from "@/lib/kpi/detalhado/get-kpi-detalhado";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";

type SortDir = "desc" | "asc";
type SortState = { slug: string; dir: SortDir } | null;

// Larguras fixas das duas primeiras colunas (sticky) — usadas tanto no
// offset `left` quanto no cálculo de minWidth da tabela.
const COL_OPERADOR_W = 150;
const COL_GESTOR_W = 210;
// "Status" acompanha o scroll horizontal (não é sticky) — só Operador e
// Gestor ficam congelados.
const COL_STATUS_W = 140;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Ciclo de ordenação de uma coluna de KPI, a cada clique no header:
 *   aleatório (null) → decrescente → crescente → aleatório → ...
 * Só uma coluna fica ativa por vez: clicar em outra zera a anterior.
 * (A coluna "Gestor" NÃO usa isto — ela abre um filtro, não ordena.)
 */
function proximoSort(atual: SortState, slug: string): SortState {
  if (!atual || atual.slug !== slug) return { slug, dir: "desc" };
  if (atual.dir === "desc") return { slug, dir: "asc" };
  return null;
}

function SortIcon({ ativo, dir }: { ativo: boolean; dir: SortDir | null }) {
  if (!ativo || dir === null) {
    return (
      <IconSelector
        size={14}
        className="ml-1 inline-block align-middle opacity-40"
        aria-hidden="true"
      />
    );
  }
  return dir === "asc" ? (
    <IconChevronUp
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  ) : (
    <IconChevronDown
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  );
}

interface KpiDetalhadoSectionProps {
  dados: KpiDetalhadoData;
}

export function KpiDetalhadoSection({ dados }: KpiDetalhadoSectionProps) {
  const { colunas, linhas, dataCorte, gestores } = dados;

  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [gestorFiltro, setGestorFiltro] = useState<string | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // "Último clique foi dentro do container da tabela?" — decide se as setas
  // rolam a tabela ou a página.
  const cliqueDentroRef = useRef(false);

  const gestorFiltroNome = gestorFiltro
    ? (gestores.find((g) => g.id === gestorFiltro)?.nome ?? null)
    : null;

  // ── Setas do teclado: rolam SÓ a tabela quando o foco está nela, SÓ a
  // página quando não está. Nunca as duas. Não interfere em inputs.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const cont = scrollRef.current;
      cliqueDentroRef.current = !!cont && cont.contains(e.target as Node);
    }

    function onKeyDown(e: KeyboardEvent) {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;

      const ae = document.activeElement as HTMLElement | null;
      const digitando =
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable);
      if (digitando) return; // deixa o cursor de texto se mover nativamente

      const cont = scrollRef.current;
      const alvo: HTMLElement | Window =
        cliqueDentroRef.current && cont ? cont : window;

      const passoV = 120;
      const passoH = 160;
      const delta =
        e.key === "ArrowUp"
          ? { top: -passoV, left: 0 }
          : e.key === "ArrowDown"
            ? { top: passoV, left: 0 }
            : e.key === "ArrowLeft"
              ? { top: 0, left: -passoH }
              : { top: 0, left: passoH };

      // A página não rola horizontalmente — ignora ←/→ quando o alvo é a
      // janela, pra não engolir a tecla à toa.
      if (alvo === window && delta.left !== 0) return;

      e.preventDefault();
      alvo.scrollBy({ ...delta, behavior: "smooth" });
    }

    document.addEventListener("mousedown", onDocMouseDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const linhasFiltradas = useMemo(() => {
    const termo = normalizar(busca);
    return linhas.filter((l) => {
      if (gestorFiltro && l.gestorId !== gestorFiltro) return false;
      if (termo && !normalizar(l.nome).includes(termo)) return false;
      return true;
    });
  }, [linhas, busca, gestorFiltro]);

  const linhasOrdenadas = useMemo(() => {
    if (!sort) return linhasFiltradas;
    const idx = colunas.findIndex((c) => c.slug === sort.slug);
    if (idx === -1) return linhasFiltradas;
    return [...linhasFiltradas].sort((a, b) => {
      const va = a.celulas[idx]?.valor ?? null;
      const vb = b.celulas[idx]?.valor ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.dir === "desc" ? vb - va : va - vb;
    });
  }, [linhasFiltradas, sort, colunas]);

  const minWidth =
    COL_OPERADOR_W + COL_GESTOR_W + COL_STATUS_W + colunas.length * 116;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          Painel do Gestor
        </span>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="ds-h1">KPI Detalhado</h1>
          <span className="ds-mono-sm text-muted-foreground">
            / Operação · {gestorFiltroNome ?? "Todos os gestores"}
            {dataCorte && ` · Dados até ${formatDateBR(dataCorte)}`}
          </span>
        </div>
      </header>

      {/* Filtro: só a busca por nome (independente). O filtro de gestor
          agora vive no cabeçalho da coluna "Gestor" da tabela. */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <div className="relative">
          <IconSearch
            size={15}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar operador..."
            className="border-border/60 bg-muted/30 focus:border-primary focus:ring-primary/20 ds-mono-sm w-64 rounded-md border py-1.5 pr-3 pl-9 outline-none focus:ring-2"
          />
        </div>

        <span className="text-muted-foreground ds-mono-sm ml-auto">
          {linhasOrdenadas.length} operador
          {linhasOrdenadas.length === 1 ? "" : "es"}
          {gestorFiltroNome && ` · ${gestorFiltroNome}`}
        </span>
      </div>

      <div className="border-border relative border-t border-dashed pt-4">
        {linhas.length === 0 ? (
          <StyledCard withGradient className="p-8 text-center">
            <p className="ds-body text-muted-foreground">
              Nenhum operador com dados no período.
            </p>
          </StyledCard>
        ) : (
          <StyledCard withGradient className="p-3">
            <div
              ref={scrollRef}
              className="elevation-1 scrollbar-tema overflow-auto rounded-xl border border-border/80"
              style={{ maxHeight: "72vh" }}
            >
              <table
                className="w-full border-collapse text-sm"
                style={{ minWidth }}
              >
                <thead>
                  <tr>
                    <th
                      className="ds-mono-sm text-muted-foreground border-border/50 bg-card sticky top-0 left-0 z-30 border-r border-b px-4 py-2.5 text-left align-middle font-semibold tracking-wider uppercase whitespace-nowrap shadow-sm select-none"
                      style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                    >
                      Operador
                    </th>

                    {/* Coluna "Gestor": o HEADER INTEIRO é a área de clique do
                        filtro (não só o ícone). Não cicla ordenação. */}
                    <th
                      className="ds-mono-sm text-muted-foreground border-border/50 bg-card sticky top-0 z-30 border-r border-b p-0 text-left align-middle font-semibold tracking-wider uppercase whitespace-nowrap shadow-sm select-none"
                      style={{
                        left: COL_OPERADOR_W,
                        width: COL_GESTOR_W,
                        minWidth: COL_GESTOR_W,
                      }}
                    >
                      <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title="Filtrar por gestor"
                            className={cn(
                              "hover:text-foreground hover:bg-muted/40 flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 uppercase transition-colors",
                              gestorFiltro && "text-primary",
                            )}
                          >
                            <span>Gestor</span>
                            {gestorFiltro ? (
                              <IconFilterFilled
                                size={13}
                                className="text-primary shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <IconFilter
                                size={13}
                                className="shrink-0 opacity-60"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setGestorFiltro(null);
                              setFiltroAberto(false);
                            }}
                            className={cn(
                              "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                              !gestorFiltro && "text-primary font-medium",
                            )}
                          >
                            Todos os gestores
                          </button>
                          <div className="bg-border/60 my-1 h-px" />
                          <div className="scrollbar-tema max-h-64 overflow-y-auto">
                            {gestores.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setGestorFiltro(g.id);
                                  setFiltroAberto(false);
                                }}
                                className={cn(
                                  "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                                  gestorFiltro === g.id &&
                                    "text-primary font-medium",
                                )}
                              >
                                {g.nome}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>

                    {/* Status: só exibição (badge), não entra no ciclo de
                        ordenação das colunas de KPI. */}
                    <th
                      className="ds-mono-sm text-muted-foreground border-border/50 bg-card sticky top-0 z-20 border-r border-b px-3 py-2.5 text-left align-middle font-semibold tracking-wider uppercase whitespace-nowrap shadow-sm select-none"
                      style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                    >
                      Status
                    </th>

                    {colunas.map((c, idx) => {
                      const ativo = sort?.slug === c.slug;
                      return (
                        <th
                          key={c.slug}
                          onClick={() =>
                            setSort((prev) => proximoSort(prev, c.slug))
                          }
                          title="Clique para ordenar (aleatório → ↓ → ↑)"
                          className={cn(
                            "ds-mono-sm text-muted-foreground bg-card hover:text-foreground border-border/50 sticky top-0 z-20 cursor-pointer border-b px-3 py-2.5 text-center font-semibold tracking-wider uppercase whitespace-nowrap shadow-sm transition-colors select-none",
                            idx < colunas.length - 1 && "border-r",
                            ativo && "text-foreground",
                          )}
                        >
                          {c.label}
                          <SortIcon ativo={ativo} dir={sort?.dir ?? null} />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {linhasOrdenadas.map((linha, i) => (
                    <tr
                      key={linha.email}
                      className="hover:bg-muted/10 transition-colors"
                      style={{
                        borderBottom:
                          i < linhasOrdenadas.length - 1
                            ? "1px solid var(--border)"
                            : undefined,
                      }}
                    >
                      <td
                        className="ds-body bg-card border-border/30 sticky left-0 z-10 border-r px-4 py-2 text-left align-middle font-medium whitespace-nowrap shadow-sm"
                        style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                      >
                        {linha.nome}
                      </td>
                      <td
                        className="ds-mono-sm text-muted-foreground bg-card border-border/30 sticky z-10 border-r px-3 py-2 text-left align-middle whitespace-nowrap shadow-sm"
                        style={{
                          left: COL_OPERADOR_W,
                          width: COL_GESTOR_W,
                          minWidth: COL_GESTOR_W,
                        }}
                      >
                        {linha.gestorNome}
                      </td>
                      <td
                        className="ds-mono-sm text-muted-foreground border-border/30 border-r px-3 py-2 text-left align-middle whitespace-nowrap"
                        style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                      >
                        {linha.statusLabel}
                      </td>
                      {linha.celulas.map((cel, idx) => {
                        const v = statusColorVar(cel.status, cel.valor === null);
                        return (
                          <td
                            key={cel.slug}
                            className={cn(
                              "ds-mono-sm px-3 py-2 text-center",
                              idx < linha.celulas.length - 1 &&
                                "border-border/30 border-r",
                            )}
                            style={celulaStyle(cel.status, cel.valor === null)}
                          >
                            {cel.valor === null ? (
                              cel.valorTexto ? (
                                <span>{cel.valorTexto}</span>
                              ) : (
                                <span className="text-muted-foreground">N/D</span>
                              )
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1.5">
                                <span
                                  style={{ fontVariantNumeric: "tabular-nums" }}
                                >
                                  {formatKpiValue(cel.valor, cel.valueType)}
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
                  {linhasOrdenadas.length === 0 && (
                    <tr>
                      <td
                        colSpan={colunas.length + 3}
                        className="ds-body text-muted-foreground px-4 py-8 text-center"
                      >
                        Nenhum operador corresponde aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </StyledCard>
        )}
      </div>
    </motion.section>
  );
}
