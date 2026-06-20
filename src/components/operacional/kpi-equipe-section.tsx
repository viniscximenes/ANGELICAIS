"use client";

import { useMemo, useState } from "react";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type {
  KpiCelulaSerial,
  KpiEquipeSerial,
  OperadorKpiSerial,
} from "@/lib/kpi/gestor/serial-types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

type Mes = "atual" | "passado";
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

function formatNomeDisplay(nome: string): string {
  return nome.toLowerCase();
}

function celulaStyle(
  kpi: KpiCelulaSerial,
  isMesPassado: boolean,
): React.CSSProperties {
  if (isMesPassado || kpi.status === "neutral" || kpi.valor === null) return {};
  const v =
    kpi.status === "success"
      ? "--success"
      : kpi.status === "warning"
        ? "--warning"
        : "--danger";
  return {
    backgroundColor: `color-mix(in oklch, var(${v}) 10%, transparent)`,
    color: `var(${v})`,
  };
}

function applySortToOperadores(
  operadores: OperadorKpiSerial[],
  sort: SortState,
): OperadorKpiSerial[] {
  return [...operadores].sort((a, b) => {
    if (sort.slug === "operador") {
      const cmp = formatNomeDisplay(a.nome).localeCompare(
        formatNomeDisplay(b.nome),
        "pt-BR",
      );
      return sort.dir === "asc" ? cmp : -cmp;
    }
    const va = a.kpis.find((k) => k.slug === sort.slug)?.valor ?? null;
    const vb = b.kpis.find((k) => k.slug === sort.slug)?.valor ?? null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1; // nulos sempre ao fim
    if (vb === null) return -1;
    return sort.dir === "desc" ? vb - va : va - vb;
  });
}

function SortIcon({ slug, sort }: { slug: string; sort: SortState }) {
  if (sort.slug !== slug) {
    return (
      <span className="ml-1 opacity-25 select-none" aria-hidden>
        ⇅
      </span>
    );
  }
  return (
    <span className="ml-1 select-none" aria-hidden>
      {sort.dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

interface KpiEquipeSectionProps {
  dataAtual: KpiEquipeSerial;
  dataPassado: KpiEquipeSerial;
}

export function KpiEquipeSection({
  dataAtual,
  dataPassado,
}: KpiEquipeSectionProps) {
  const [mes, setMes] = useState<Mes>("atual");
  // Padrão: Operador asc (ordem alfabética — mesma do servidor).
  const [sort, setSort] = useState<SortState>({ slug: "operador", dir: "asc" });

  const data = mes === "atual" ? dataAtual : dataPassado;

  // Resetar sort para padrão ao trocar de mês.
  const handleMesChange = (m: Mes) => {
    setMes(m);
    setSort({ slug: "operador", dir: "asc" });
  };

  const handleSort = (slug: string) => {
    setSort((prev) => ({
      slug,
      dir: prev.slug === slug && prev.dir === "desc" ? "asc" : "desc",
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
      {/* Toggle de mês */}
      <div
        role="tablist"
        className="elevation-1 inline-flex gap-1 rounded-md p-1"
      >
        {(["atual", "passado"] as Mes[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mes === m}
            onClick={() => handleMesChange(m)}
            className={[
              "ds-small rounded-md px-4 py-1.5 transition-colors",
              mes === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {m === "atual" ? "Mês Atual" : "Mês Passado"}
          </button>
        ))}
      </div>

      {/* Referência do período */}
      <div className="flex items-center gap-3">
        <span className="ds-mono-sm text-muted-foreground">
          {formatMesRef(data.mesRef)}
        </span>
        {data.dataCorte && (
          <>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span className="ds-mono-sm text-muted-foreground">
              Dados até {formatDateBR(data.dataCorte)}
            </span>
          </>
        )}
      </div>

      {data.operadores.length === 0 ? (
        <div
          className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          Nenhum dado encontrado para {formatMesRef(data.mesRef)}.
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl scrollbar-tema"
          style={{ border: "1px solid var(--border)" }}
        >
          <table
            className="w-full border-collapse text-sm"
            style={{ minWidth: 860 }}
          >
            <thead>
              <tr
                className="border-b bg-muted/40"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Coluna Operador */}
                <th
                  className="ds-small text-muted-foreground sticky left-0 bg-muted/40 px-4 py-3 text-left font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors border-r border-border/30"
                  style={{ zIndex: 10 }}
                  onClick={() => handleSort("operador")}
                >
                  Operador
                  <SortIcon slug="operador" sort={sort} />
                </th>

                {/* Colunas de KPI */}
                {headers.map((h) => (
                  <th
                    key={h.slug}
                    className="ds-small text-muted-foreground px-3 py-3 text-center font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
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
                  className="hover:bg-muted/10 transition-colors"
                  style={{
                    borderBottom:
                      i < sortedOps.length - 1
                        ? "1px solid var(--border)"
                        : undefined,
                  }}
                >
                  <td
                    className="ds-small sticky left-0 px-4 py-3 font-medium border-r border-border/30"
                    style={{ backgroundColor: "var(--card)", zIndex: 5 }}
                  >
                    {formatNomeDisplay(op.nome)}
                  </td>
                  {op.kpis.map((kpi) => (
                    <td
                      key={kpi.slug}
                      className="ds-mono-sm px-3 py-3 text-center"
                      style={celulaStyle(kpi, data.isMesPassado)}
                    >
                      {kpi.valor === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatKpiValue(kpi.valor, kpi.valueType)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
