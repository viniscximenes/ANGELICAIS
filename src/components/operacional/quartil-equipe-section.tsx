"use client";

import { useMemo, useState } from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type {
  KpiQuartilSerial,
  OperadorQuartilSerial,
  QuartilEquipeSerial,
} from "@/lib/kpi/gestor/quartil-serial-types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

type Universo = "equipe" | "empresa";
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

// Paleta quartil: Q1 verde (melhor) → Q2 azul → Q3 âmbar → Q4 vermelho (pior)
function quartilColors(q: 1 | 2 | 3 | 4): [bgColor: string, textColor: string] {
  switch (q) {
    case 1:
      return [
        "color-mix(in oklch, var(--success) 20%, transparent)",
        "var(--success)",
      ];
    case 2:
      return [
        "color-mix(in oklch, var(--primary) 15%, transparent)",
        "var(--primary)",
      ];
    case 3:
      return [
        "color-mix(in oklch, var(--warning) 20%, transparent)",
        "var(--warning)",
      ];
    case 4:
      return [
        "color-mix(in oklch, var(--danger) 20%, transparent)",
        "var(--danger)",
      ];
  }
}

function QuartilCell({ kpi }: { kpi: KpiQuartilSerial }) {
  if (kpi.quartil === null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const { quartil, rank, total } = kpi.quartil;
  const [bgColor, textColor] = quartilColors(quartil);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="ds-mono-sm text-sm font-semibold text-foreground">
        {kpi.valor !== null
          ? formatKpiValue(kpi.valor, kpi.valueType)
          : "—"}
      </span>
      <div className="flex items-center gap-1">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold leading-none uppercase tracking-wider"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          Q{quartil}
        </span>
        <span className="tabular-nums text-[9px] text-muted-foreground/50 font-medium">
          #{rank}/{total}
        </span>
      </div>
    </div>
  );
}

function applySortToOperadores(
  operadores: OperadorQuartilSerial[],
  sort: SortState,
): OperadorQuartilSerial[] {
  return [...operadores].sort((a, b) => {
    if (sort.slug === "operador") {
      const cmp = a.nome.localeCompare(b.nome, "pt-BR");
      return sort.dir === "asc" ? cmp : -cmp;
    }
    const rankA = a.kpis.find((k) => k.slug === sort.slug)?.quartil?.rank ?? null;
    const rankB = b.kpis.find((k) => k.slug === sort.slug)?.quartil?.rank ?? null;
    if (rankA === null && rankB === null) return 0;
    if (rankA === null) return 1;
    if (rankB === null) return -1;
    return sort.dir === "asc" ? rankA - rankB : rankB - rankA;
  });
}

function SortIcon({ slug, sort }: { slug: string; sort: SortState }) {
  if (sort.slug !== slug) {
    return (
      <IconSelector
        size={14}
        className="ml-1 inline-block align-middle opacity-40"
        aria-hidden="true"
      />
    );
  }
  return sort.dir === "asc" ? (
    <IconChevronUp
      size={14}
      className="ml-1 inline-block align-middle text-primary"
      aria-hidden="true"
    />
  ) : (
    <IconChevronDown
      size={14}
      className="ml-1 inline-block align-middle text-primary"
      aria-hidden="true"
    />
  );
}

interface QuartilEquipeSectionProps {
  dataEquipe: QuartilEquipeSerial;
  dataEmpresa: QuartilEquipeSerial;
}

export function QuartilEquipeSection({
  dataEquipe,
  dataEmpresa,
}: QuartilEquipeSectionProps) {
  const [universo, setUniverso] = useState<Universo>("equipe");
  // Padrão: ordem alfabética. Colunas KPI: asc = rank 1 (melhor) no topo.
  const [sort, setSort] = useState<SortState>({ slug: "operador", dir: "asc" });

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [topScrollEl, setTopScrollEl] = useState<HTMLDivElement | null>(null);

  useMemo(() => {
    if (!scrollEl || !topScrollEl) return;

    const handleScroll = () => {
      if (topScrollEl.scrollLeft !== scrollEl.scrollLeft) {
        topScrollEl.scrollLeft = scrollEl.scrollLeft;
      }
    };

    const handleTopScroll = () => {
      if (scrollEl.scrollLeft !== topScrollEl.scrollLeft) {
        scrollEl.scrollLeft = topScrollEl.scrollLeft;
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    topScrollEl.addEventListener("scroll", handleTopScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      topScrollEl.removeEventListener("scroll", handleTopScroll);
    };
  }, [scrollEl, topScrollEl]);

  const data = universo === "equipe" ? dataEquipe : dataEmpresa;

  const handleUniversoChange = (u: Universo) => {
    setUniverso(u);
    setSort({ slug: "operador", dir: "asc" });
  };

  const handleSort = (slug: string) => {
    setSort((prev) => ({
      slug,
      // Primeiro clique → asc (rank 1 no topo = melhor); segundo → desc (pior no topo)
      dir: prev.slug === slug && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const sortedOps = useMemo(
    () => applySortToOperadores(data.operadores, sort),
    [data.operadores, sort],
  );

  const headers =
    data.operadores[0]?.kpis.map((k) => ({
      slug: k.slug,
      displayName: k.displayName,
    })) ?? [];

  return (
    <div className="space-y-4">
      {/* Toggle equipe / empresa */}
      <div
        role="tablist"
        className="elevation-1 inline-flex gap-1 rounded-md p-1"
      >
        {(["equipe", "empresa"] as Universo[]).map((u) => (
          <button
            key={u}
            role="tab"
            aria-selected={universo === u}
            onClick={() => handleUniversoChange(u)}
            className={[
              "ds-small rounded-md px-4 py-1.5 transition-colors",
              universo === u
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {u === "equipe" ? "Equipe" : "Empresa"}
          </button>
        ))}
      </div>

      {/* Referência do período e universo */}
      <div className="flex items-center gap-3">
        <span className="ds-mono-sm text-muted-foreground">
          {formatMesRef(data.mesRef)}
        </span>
        {data.dataCorte && (
          <>
            <span className="text-muted-foreground/40" aria-hidden>·</span>
            <span className="ds-mono-sm text-muted-foreground">
              Dados até {formatDateBR(data.dataCorte)}
            </span>
          </>
        )}
        <span className="text-muted-foreground/40" aria-hidden>·</span>
        <span className="ds-mono-sm text-muted-foreground">
          {universo === "equipe"
            ? `${data.operadores.length} operadores`
            : `${data.operadores.length} operadores · universo empresa`}
        </span>
      </div>

      {/* Barra de rolagem superior espelhada */}
      {data.operadores.length > 0 && (
        <div
          ref={setTopScrollEl}
          className="overflow-x-auto scrollbar-tema"
          style={{ width: "100%", scrollbarWidth: "thin" }}
        >
          <div style={{ width: 1600, height: 1 }} />
        </div>
      )}

      {/* Tabela */}
      <div
        ref={setScrollEl}
        className="overflow-x-auto rounded-xl scrollbar-tema"
        style={{ border: "1px solid var(--border)" }}
      >
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: 1600 }}
        >
          <thead>
            <tr
              className="border-b bg-muted/40"
              style={{ borderColor: "var(--border)" }}
            >
              <th
                className="ds-small text-muted-foreground sticky left-0 bg-muted/40 px-4 py-2 text-left font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors border-r border-border/20"
                style={{ zIndex: 10 }}
                onClick={() => handleSort("operador")}
              >
                Operador
                <SortIcon slug="operador" sort={sort} />
              </th>
              {headers.map((h) => (
                <th
                  key={h.slug}
                  className="ds-small text-muted-foreground px-3 py-2 text-center font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
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
                <td
                  className="ds-small sticky left-0 bg-card group-hover:bg-muted/10 px-4 py-2.5 font-medium border-r border-border/20 transition-colors"
                  style={{ zIndex: 5 }}
                >
                  {op.nome.toLowerCase()}
                </td>
                {op.kpis.map((kpi) => (
                  <td
                    key={kpi.slug}
                    className="px-3 py-2 text-center"
                  >
                    <QuartilCell kpi={kpi} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
