"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconClipboard,
  IconLoader2,
  IconCalendar,
  IconChevronDown,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { StyledCard } from "@/components/gestor/styled-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatDateBR,
  getCurrentMonthRef,
  getLastDayOfMonth,
  getToday,
  getYesterday,
  toMonthRef,
} from "@/lib/kpi/bases/format-date";
import {
  processSnapshotAction,
  type ProcessSnapshotResult,
} from "@/lib/kpi/bases/process-snapshot-action";

import {
  OverrideMappingModal,
  type MissingKpiInfo,
} from "./override-mapping-modal";
import { SnapshotResult } from "./snapshot-result";

function formatMonthLabelNumerical(mesRef: string): string {
  if (!mesRef) return "";
  const parts = mesRef.split("-");
  if (parts.length < 2) return mesRef;
  const [year, month] = parts;
  return `${month}/${year}`;
}

interface CustomCalendarProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
}

function CustomCalendar({ value, onChange, min, max }: CustomCalendarProps) {
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const [y, m, d] = dStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const [viewDate, setViewDate] = useState(() => parseDate(value));

  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const isSelected = (d: Date) => {
    if (!value) return false;
    const parsed = parseDate(value);
    return (
      d.getDate() === parsed.getDate() &&
      d.getMonth() === parsed.getMonth() &&
      d.getFullYear() === parsed.getFullYear()
    );
  };

  const isDisabled = (d: Date) => {
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    const dStrFull = `${yStr}-${mStr}-${dStr}`;
    if (min && dStrFull < min) return true;
    if (max && dStrFull > max) return true;
    return false;
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= lastDayOfMonth; d++) {
    days.push(new Date(year, month, d));
  }

  return (
    <div className="w-64 p-3 bg-popover text-popover-foreground">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <IconChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold select-none">
          {monthNames[month]} de {year}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((w, idx) => (
          <span key={idx} className="text-[10px] font-mono text-muted-foreground select-none font-bold">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => {
          if (!d) return <div key={idx} />;
          const selected = isSelected(d);
          const disabled = isDisabled(d);
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const yStr = d.getFullYear();
                const mStr = String(d.getMonth() + 1).padStart(2, "0");
                const dStr = String(d.getDate()).padStart(2, "0");
                onChange(`${yStr}-${mStr}-${dStr}`);
              }}
              className={cn(
                "h-7 w-7 text-xs font-semibold rounded-md flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-30 disabled:cursor-not-allowed",
                selected
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : disabled
                    ? "text-muted-foreground/40 hover:bg-transparent"
                    : "text-foreground hover:bg-muted"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CustomMonthYearPickerProps {
  value: string;
  onChange: (val: string) => void;
}

function CustomMonthYearPicker({ value, onChange }: CustomMonthYearPickerProps) {
  const parseVal = (v: string) => {
    if (!v) return { y: new Date().getFullYear(), m: new Date().getMonth() };
    const [year, month] = v.split("-").map(Number);
    return { y: year, m: month - 1 };
  };

  const { y, m } = parseVal(value);
  const [year, setYear] = useState(y);

  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  return (
    <div className="w-56 p-3 bg-popover text-popover-foreground">
      <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
        <button
          type="button"
          onClick={() => setYear(year - 1)}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <IconChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold select-none">{year}</span>
        <button
          type="button"
          onClick={() => setYear(year + 1)}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {monthNames.map((name, idx) => {
          const selected = idx === m && year === y;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const yStr = year;
                const mStr = String(idx + 1).padStart(2, "0");
                onChange(`${yStr}-${mStr}`);
              }}
              className={cn(
                "h-8 text-xs font-semibold rounded-md flex items-center justify-center transition-colors cursor-pointer select-none",
                selected
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface SnapshotFormProps {
  existingMonths: string[];
  selectedOption: string;
  setSelectedOption: (val: string) => void;
  customMonth: string;
  setCustomMonth: (val: string) => void;
  dataCorte: string;
  setDataCorte: (val: string) => void;
  effectiveMesRef: string;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
}

export function SnapshotForm({
  existingMonths,
  selectedOption,
  setSelectedOption,
  customMonth,
  setCustomMonth,
  dataCorte,
  setDataCorte,
  effectiveMesRef,
  isCurrentMonth,
  isPastMonth,
}: SnapshotFormProps) {
  const currentMesRef = getCurrentMonthRef();

  const [clipboardText, setClipboardText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customMonthPopoverOpen, setCustomMonthPopoverOpen] = useState(false);
  const [dataCortePopoverOpen, setDataCortePopoverOpen] = useState(false);
  const [result, setResult] = useState<ProcessSnapshotResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [missingKpisForModal, setMissingKpisForModal] = useState<
    MissingKpiInfo[]
  >([]);
  const [detectedHeadersForModal, setDetectedHeadersForModal] = useState<
    string[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);

  const pastMonths = existingMonths.filter((m) => m !== currentMesRef);

  const options = useMemo(() => [
    { value: currentMesRef, label: formatMonthLabelNumerical(currentMesRef) },
    ...pastMonths.map((m) => ({ value: m, label: formatMonthLabelNumerical(m) })),
    { value: "__other__", label: "Outro mês…" },
  ], [currentMesRef, pastMonths]);

  const selectedItem = useMemo(() => options.find((opt) => opt.value === selectedOption) || {
    value: selectedOption,
    label: selectedOption === "__other__" ? "Outro mês…" : formatMonthLabelNumerical(selectedOption),
  }, [options, selectedOption]);

  async function processWithOverrides(overrides?: Record<string, string>) {
    const res = await processSnapshotAction({
      clipboardText,
      mesRef: effectiveMesRef,
      dataCorte,
      headerOverrides: overrides,
    });

    setResult(res);

    if (res.success) {
      if (res.missingKpis.length > 0 && !overrides) {
        setMissingKpisForModal(res.missingKpisFull);
        setDetectedHeadersForModal(res.detectedHeaders);
        setModalOpen(true);
        toast.warning("Alguns KPIs não foram encontrados", {
          description: "Ajuste os nomes no modal que apareceu.",
        });
      } else {
        toast.success("Snapshot processado", {
          description: `${res.totalOperators} operadores salvos`,
        });
        setClipboardText("");
        setModalOpen(false);
      }
    } else {
      toast.error("Falha ao salvar", { description: res.error });
    }
  }

  function handleSubmit() {
    if (!effectiveMesRef) {
      toast.error("Selecione um mês válido");
      return;
    }

    if (!clipboardText.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }

    startTransition(async () => {
      await processWithOverrides();
    });
  }

  function handleReprocessWithOverrides(overrides: Record<string, string>) {
    startTransition(async () => {
      await processWithOverrides(overrides);
    });
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2, ease: EASE_OUT_EXPO }}
      >
        <StyledCard withGradient className="gap-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="ds-mono-sm text-muted-foreground mb-1 block">
                Mês de referência
              </label>
              <div className="relative">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
                >
                  <span>{selectedItem.label}</span>
                  <IconChevronDown
                    size={14}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200",
                      dropdownOpen && "rotate-180"
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/80 bg-popover p-1 shadow-2xl">
                      {options.map((opt) => {
                        const isSelected = opt.value === selectedOption;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedOption(opt.value);
                              setDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                : "text-foreground hover:bg-muted/60"
                            )}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <IconCheck size={14} className="text-primary-foreground" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {selectedOption === "__other__" && (
                <div className="mt-2">
                  <Popover open={customMonthPopoverOpen} onOpenChange={setCustomMonthPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isPending}
                        className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
                      >
                        <span>{customMonth ? formatMonthLabelNumerical(customMonth + "-01") : "Selecione o mês..."}</span>
                        <IconCalendar size={14} className="text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 border border-border/80 shadow-2xl backdrop-blur-md rounded-xl">
                      <CustomMonthYearPicker
                        value={customMonth}
                        onChange={(val) => {
                          setCustomMonth(val);
                          setCustomMonthPopoverOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="data-corte"
                className="ds-mono-sm text-muted-foreground mb-1 block"
              >
                Dados até o dia
              </label>
              <Popover open={dataCortePopoverOpen} onOpenChange={setDataCortePopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isPending || !effectiveMesRef}
                    className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
                  >
                    <span>{dataCorte ? formatDateBR(dataCorte) : "Selecione a data..."}</span>
                    <IconCalendar size={14} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 border border-border/80 shadow-2xl backdrop-blur-md rounded-xl">
                  <CustomCalendar
                    value={dataCorte}
                    onChange={(val) => {
                      setDataCorte(val);
                      setDataCortePopoverOpen(false);
                    }}
                    min={effectiveMesRef || undefined}
                    max={
                      isCurrentMonth
                        ? getToday()
                        : effectiveMesRef
                          ? getLastDayOfMonth(effectiveMesRef)
                          : undefined
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isPastMonth && effectiveMesRef && (
            <div
              className="flex items-start gap-2 rounded-md p-3"
              style={{
                background:
                  "color-mix(in oklch, var(--warning) 12%, transparent)",
                border:
                  "1px solid color-mix(in oklch, var(--warning) 35%, transparent)",
              }}
              role="alert"
            >
              <IconAlertTriangle
                size={16}
                style={{
                  color: "var(--warning)",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
                aria-hidden="true"
              />
              <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
                Você está colando dados de um mês fechado. Os valores atuais
                desse mês serão sobrescritos.
              </p>
            </div>
          )}
        </StyledCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.2, ease: EASE_OUT_EXPO }}
      >
        <StyledCard withGradient className="gap-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <IconClipboard
                size={18}
                className="text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <label htmlFor="clipboard-textarea" className="ds-body font-medium block">
                COLAR KPI - OPERADORES
              </label>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !effectiveMesRef}
              className={cn(
                "bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ fontSize: "12px" }}
            >
              {isPending && (
                <IconLoader2
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              <span className="ds-mono-sm font-medium">
                {isPending ? "Processando..." : "Enviar dados"}
              </span>
            </button>
          </div>

          <textarea
            id="clipboard-textarea"
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            disabled={isPending}
            rows={4}
            placeholder=""
            className="ds-mono-sm elevation-2 w-full rounded-md px-3 py-2 bg-background text-foreground focus:outline-none"
            style={{
              border: "1px solid var(--border)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "12px",
              resize: "none",
              minHeight: "100px",
            }}
          />
        </StyledCard>
      </motion.div>

      {result && <SnapshotResult result={result} />}

      <OverrideMappingModal
        open={modalOpen}
        missingKpis={missingKpisForModal}
        detectedHeaders={detectedHeadersForModal}
        onCancel={() => setModalOpen(false)}
        onReprocess={handleReprocessWithOverrides}
        isPending={isPending}
      />
    </div>
  );
}
