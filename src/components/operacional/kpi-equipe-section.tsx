"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconX, IconSelector, IconChevronUp, IconChevronDown } from "@tabler/icons-react";

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

interface OperatorDetailModalProps {
  operador: OperadorKpiSerial;
  isMesPassado: boolean;
  onClose: () => void;
}

function SecondaryKpiCard({ kpi, isMesPassado }: { kpi: KpiCelulaSerial; isMesPassado: boolean }) {
  const status = kpi.status;
  const isVariation = kpi.valueType === "percent_negative";
  
  let color = "var(--muted-foreground)";
  if (!isMesPassado) {
    if (status === "success") color = "var(--success)";
    else if (status === "warning") color = "var(--warning)";
    else if (status === "danger") color = "var(--danger)";
  }

  const valueColor = isMesPassado || isVariation || status === "neutral" ? "var(--foreground)" : undefined;

  return (
    <div className="elevation-1 relative overflow-hidden rounded-lg p-5 border border-border/50 bg-muted/10">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{
          background: isMesPassado || isVariation ? "var(--muted-foreground)" : color,
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

function OperatorDetailModal({
  operador,
  isMesPassado,
  onClose,
}: OperatorDetailModalProps) {
  useMemo(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
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
                  {operador.nome.toLowerCase()}
                </h2>
                <p className="ds-mono-sm text-muted-foreground text-xs mt-1">
                  KPIs Secundários · {isMesPassado ? "Mês Passado (Neutro)" : "Mês Atual"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
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
      <IconSelector size={14} className="ml-1 inline-block opacity-40 align-middle" aria-hidden="true" />
    );
  }
  return sort.dir === "asc" ? (
    <IconChevronUp size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
  ) : (
    <IconChevronDown size={14} className="ml-1 inline-block text-primary align-middle" aria-hidden="true" />
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
  // Padrão: tx_retencao_bruta desc (maior para menor taxa de retenção).
  const [sort, setSort] = useState<SortState>({ slug: "tx_retencao_bruta", dir: "desc" });
  const [selectedOperator, setSelectedOperator] = useState<OperadorKpiSerial | null>(null);

  const data = mes === "atual" ? dataAtual : dataPassado;

  // Resetar sort para padrão ao trocar de mês.
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
                  className="ds-small text-muted-foreground sticky left-0 bg-muted/40 px-4 py-2 text-left font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors border-r border-border/20"
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
                    className="ds-small sticky left-0 bg-card group-hover:bg-muted/10 px-4 py-2 font-medium border-r border-border/20 cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors"
                    style={{ zIndex: 5 }}
                    onClick={() => setSelectedOperator(op)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedOperator(op);
                      }
                    }}
                  >
                    {formatNomeDisplay(op.nome)}
                  </td>
                  {op.kpis.map((kpi) => (
                    <td
                      key={kpi.slug}
                      className="ds-mono-sm px-3 py-2 text-center"
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

      {selectedOperator && (
        <OperatorDetailModal
          operador={selectedOperator}
          isMesPassado={data.isMesPassado}
          onClose={() => setSelectedOperator(null)}
        />
      )}
    </div>
  );
}
