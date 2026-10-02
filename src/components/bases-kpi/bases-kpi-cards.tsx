"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import {
  formatDateBR,
  getCurrentMonthRef,
  getToday,
  getYesterday,
  toMonthRef,
} from "@/lib/kpi/bases/format-date";
import { Segmentado } from "@/components/dashboard/retencao/segmentado";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MonthSummary } from "@/lib/kpi/bases/get-snapshots-summary";
import { cn } from "@/lib/utils";

import { BasesKpiConteudoSkeleton } from "./bases-kpi-skeleton";
import { GestorSnapshotForm } from "./gestor-snapshot-form";
import { SnapshotForm } from "./snapshot-form";
import { SnapshotsHistory } from "./snapshots-history";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const TROCA_SKELETON_MS = 3_000;
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface CalendarioProps {
  value: string;
  onChange: (val: string) => void;
  max?: string;
}

/**
 * Calendário da data de corte. Grade sempre com 6 semanas (altura fixa, sem
 * "pular" ao trocar de mês), dias dos meses vizinhos esmaecidos, marca de
 * "hoje" (pontinho) e atalhos Ontem/Hoje no rodapé.
 */
function Calendario({ value, onChange, max }: CalendarioProps) {
  // Montado só quando o popover abre, então o mês inicial já parte do valor.
  const [viewDate, setViewDate] = useState(() => {
    const d = parseIso(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const hoje = getToday();
  const ontem = getYesterday();

  const inicio = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const dias = Array.from(
    { length: 42 },
    (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i),
  );

  const proximoBloqueado = !!max && toIso(new Date(year, month + 1, 1)) > max;

  const navClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors cursor-pointer hover:bg-muted/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

  return (
    <div className="font-sans w-[17.5rem] p-3 text-popover-foreground">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className={navClass}
        >
          <IconChevronLeft size={16} />
        </button>
        <span className="text-sm font-normal tracking-tight select-none">
          {MESES[month]} <span className="text-muted-foreground">{year}</span>
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={proximoBloqueado}
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className={navClass}
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {DIAS_SEMANA.map((w) => (
          <span key={w} className="text-muted-foreground/80 py-1 text-[11px] font-medium select-none">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {dias.map((d) => {
          const iso = toIso(d);
          const foraDoMes = d.getMonth() !== month;
          const selecionado = iso === value;
          const ehHoje = iso === hoje;
          const bloqueado = !!max && iso > max;
          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueado}
              aria-pressed={selecionado}
              aria-label={formatDateBR(iso)}
              onClick={() => onChange(iso)}
              className={cn(
                "relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                selecionado
                  ? "bg-primary text-primary-foreground font-semibold"
                  : bloqueado
                    ? "text-muted-foreground/25 cursor-not-allowed"
                    : foraDoMes
                      ? "text-muted-foreground/45 hover:bg-muted/50"
                      : "text-foreground hover:bg-muted/60",
              )}
            >
              {d.getDate()}
              {ehHoje && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    selecionado ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-border/60 mt-3 flex items-center gap-2 border-t pt-3">
        {[
          { rotulo: "Ontem", iso: ontem },
          { rotulo: "Hoje", iso: hoje },
        ].map((atalho) => (
          <button
            key={atalho.rotulo}
            type="button"
            onClick={() => onChange(atalho.iso)}
            className={cn(
              "h-7 flex-1 rounded-md border text-xs font-medium transition-colors cursor-pointer",
              value === atalho.iso
                ? "border-primary/40 bg-muted/60 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

interface BasesKpiCardsProps {
  snapshots: MonthSummary[];
  gestorSnapshots: MonthSummary[];
}

export function BasesKpiCards({
  snapshots,
  gestorSnapshots,
}: BasesKpiCardsProps) {
  const [activeTab, setActiveTab] = useState<"operadores" | "gestores">("operadores");

  // Troca Operadores ↔ Gestores: mostra o skeleton do conteúdo pelo mesmo
  // piso mínimo do F5 (3s). Trocar de novo no meio reinicia a contagem.
  const [trocandoBase, setTrocandoBase] = useState(false);
  const trocaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (trocaTimer.current) clearTimeout(trocaTimer.current);
  }, []);

  function trocarBase(base: "operadores" | "gestores") {
    if (base === activeTab) return;
    setActiveTab(base);
    setTrocandoBase(true);
    if (trocaTimer.current) clearTimeout(trocaTimer.current);
    trocaTimer.current = setTimeout(() => setTrocandoBase(false), TROCA_SKELETON_MS);
  }

  const currentMesRef = getCurrentMonthRef();
  // Sem seletor de mês: o mês de referência é sempre o mês da data de corte.
  // Padrão = ontem — no dia 1, cai no mês anterior.
  const [dataCorte, setDataCorte] = useState(getYesterday());
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  const effectiveMesRef = dataCorte ? toMonthRef(dataCorte) : "";
  const isPastMonth = !!(effectiveMesRef && effectiveMesRef !== currentMesRef);

  const dateProps = {
    dataCorte,
    effectiveMesRef,
    isPastMonth,
  };

  return (
    <div className="space-y-4">
      {/* Linha de controles (padrão do Consolidado): toggle da base + data de
          corte, ambos com 32px de altura. */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmentado
          ariaLabel="Base"
          grupo="bases-kpi-base"
          opcoes={[
            { valor: "operadores", rotulo: "Operadores" },
            { valor: "gestores", rotulo: "Gestores" },
          ]}
          valor={activeTab}
          onChange={trocarBase}
        />

        <Popover open={calendarioAberto} onOpenChange={setCalendarioAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Dados até o dia"
              className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 items-center gap-2 rounded-md border bg-transparent px-3 text-xs font-normal transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <IconCalendar size={14} aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5">
                Dados até
                <span className="text-foreground font-normal tabular-nums">
                  {formatDateBR(dataCorte)}
                </span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="bg-popover border-border w-auto rounded-xl border p-0 shadow-2xl"
          >
            <Calendario
              value={dataCorte}
              onChange={(val) => {
                setDataCorte(val);
                setCalendarioAberto(false);
              }}
              max={getToday()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {trocandoBase ? (
        <BasesKpiConteudoSkeleton />
      ) : (
        <>
          <section>
            {activeTab === "operadores" ? (
              <SnapshotForm {...dateProps} />
            ) : (
              <GestorSnapshotForm {...dateProps} />
            )}
          </section>

          <SnapshotsHistory
            snapshots={activeTab === "operadores" ? snapshots : gestorSnapshots}
            type={activeTab}
          />
        </>
      )}
    </div>
  );
}
