"use client";

import { useMemo, useState } from "react";
import {
  IconFileDownload,
  IconLoader2,
  IconUser,
  IconUserCheck,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import {
  computeSemana,
  formatDataFeedback,
  type DiaInput,
} from "@/lib/feedback/compute-semana";

const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

type DiaForm = { retido: string; cancelado: string };

function parseDia(d: DiaForm): DiaInput {
  return {
    retido: d.retido === "" ? null : Number(d.retido),
    cancelado: d.cancelado === "" ? null : Number(d.cancelado),
  };
}

interface ResultadoSemanalFormProps {
  supervisorName: string;
}

// Seletor de Data Customizado - 100% Dark e integrado ao tema
function CustomDatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + "T12:00:00");
    return new Date();
  });

  const formattedDisplay = useMemo(() => {
    if (!value) return "Selecione uma data...";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }, [value]);

  const daysGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewDate]);

  const selectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="relative space-y-1.5 w-full">
      <label className="ds-small text-muted-foreground font-medium block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ds-small flex h-9 w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2 text-left text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50"}>
          {formattedDisplay}
        </span>
        <IconCalendar size={15} className="text-muted-foreground/60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute left-0 mt-1 z-50 w-64 rounded-lg p-3 shadow-xl"
            style={{
              border: "1px solid var(--border)",
              background: "color-mix(in oklch, var(--card) 95%, black)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-foreground">
                {meses[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            {/* Week Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-muted-foreground/60">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} />;
                }
                const isSelected = value === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-7 w-7 rounded text-xs transition-colors flex items-center justify-center font-medium cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ResultadoSemanalForm({ supervisorName }: ResultadoSemanalFormProps) {
  const [segundaFeira, setSegundaFeira] = useState("");
  const [dataFeedback, setDataFeedback] = useState("");
  const [operador, setOperador] = useState("");
  const [dias, setDias] = useState<DiaForm[]>(
    Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })),
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const diasInputs: DiaInput[] = useMemo(
    () => dias.map(parseDia),
    [dias],
  );

  const semana = useMemo(
    () => computeSemana(diasInputs, segundaFeira || null),
    [diasInputs, segundaFeira],
  );

  function setDiaField(idx: number, campo: "retido" | "cancelado", val: string) {
    setDias((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [campo]: val };
      return next;
    });
  }

  async function handleGerar() {
    setErro(null);

    if (!operador.trim()) { setErro("Informe o nome do operador."); return; }
    if (!segundaFeira) { setErro("Informe a data da segunda-feira do período."); return; }
    if (!dataFeedback) { setErro("Informe a data do feedback."); return; }
    const temDados = diasInputs.some((d) => d.retido !== null || d.cancelado !== null);
    if (!temDados) { setErro("Preencha pelo menos um dia para o relatório."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback/resultado-semanal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operador: operador.trim(),
          segundaFeira,
          dataFeedback,
          dias: diasInputs,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "Erro desconhecido");
        setErro(`Erro ao gerar: ${msg}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        `Feedback_Semanal_${operador.trim().replace(/\s+/g, "_")}_${semana.periodo.replace(/\//g, "-")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro("Erro de rede. Tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const dataFeedbackFormatada = dataFeedback ? formatDataFeedback(dataFeedback) : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Card 1: Dados do Documento */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-5 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Dados do Documento
          </h3>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="ds-small text-muted-foreground font-medium block">
              Nome do Operador
            </label>
            <div className="relative">
              <IconUser size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                placeholder="Informe o nome completo"
                className="ds-small w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ds-small text-muted-foreground font-medium block">
              Supervisor Responsável
            </label>
            <div className="relative">
              <IconUserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <div className="ds-small flex h-[38px] items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground font-medium">
                {supervisorName}
              </div>
            </div>
          </div>

          {/* Segunda-feira com DatePicker Customizado */}
          <CustomDatePicker
            label="Segunda-feira do Período"
            value={segundaFeira}
            onChange={setSegundaFeira}
          />

          {/* Data do Feedback com DatePicker Customizado */}
          <CustomDatePicker
            label="Data de Aplicação do Feedback"
            value={dataFeedback}
            onChange={setDataFeedback}
          />
        </div>
      </div>

      {/* Card 2: Volume Diário de Contatos */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Volume Diário de Contatos
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">Dia da Semana</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">Contatos Retidos</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">Contatos Cancelados</th>
              </tr>
            </thead>
            <tbody>
              {DIAS_LABELS.map((dia, i) => (
                <tr
                  key={dia}
                  className="hover:bg-muted/5 transition-colors"
                  style={{
                    borderBottom: i < 5 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <td className="ds-small px-4 py-2 text-muted-foreground font-semibold">
                    {semana.diasFormatados[i] ?? dia}
                  </td>
                  <td className="px-3 py-1 text-center border-l border-border/20">
                    <input
                      type="number"
                      min="0"
                      value={dias[i].retido}
                      onChange={(e) => setDiaField(i, "retido", e.target.value)}
                      placeholder="—"
                      className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                  </td>
                  <td className="px-3 py-1 text-center border-l border-border/20">
                    <input
                      type="number"
                      min="0"
                      value={dias[i].cancelado}
                      onChange={(e) => setDiaField(i, "cancelado", e.target.value)}
                      placeholder="—"
                      className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Demonstrativo de Resultados (Preview) */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Demonstrativo de Resultados (Preview)
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">Período</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Tx. Retenção</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Retidos</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Cancelados</th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Total Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {semana.dias.map((d, i) => (
                <tr
                  key={i}
                  className="hover:bg-muted/5 transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="ds-small px-4 py-2 text-muted-foreground font-medium">
                    {semana.diasFormatados[i]}
                  </td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-foreground font-semibold">{d.tx}</td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.ret}</td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.canc}</td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.ped}</td>
                </tr>
              ))}
              {/* Linha Consolidada com destaque visual profissional */}
              <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold text-base">{semana.consolidado.tx}</td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ret}</td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.canc}</td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ped}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Erro e Geração de Arquivo */}
        <div className="flex flex-col gap-3 pt-2">
          {erro && (
            <p
              className="ds-small rounded-md px-4 py-2 text-xs"
              style={{
                background: "color-mix(in oklch, var(--danger) 8%, transparent)",
                color: "var(--danger)",
                border: "1px solid color-mix(in oklch, var(--danger) 15%, transparent)",
              }}
            >
              {erro}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGerar}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-all bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconFileDownload size={16} aria-hidden="true" />
              )}
              {loading ? "Exportando..." : "Exportar Relatório Word (.docx)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
