"use client";

import { useEffect, useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconClipboard,
  IconLoader2,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  formatMonthLabel,
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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface SnapshotFormProps {
  existingMonths: string[];
  onDateChange?: (mesRef: string, dataCorte: string) => void;
}

export function SnapshotForm({ existingMonths, onDateChange }: SnapshotFormProps) {
  const currentMesRef = getCurrentMonthRef();

  const [selectedOption, setSelectedOption] = useState<string>(currentMesRef);
  const [customMonth, setCustomMonth] = useState<string>("");
  const [clipboardText, setClipboardText] = useState("");
  const [result, setResult] = useState<ProcessSnapshotResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [missingKpisForModal, setMissingKpisForModal] = useState<
    MissingKpiInfo[]
  >([]);
  const [detectedHeadersForModal, setDetectedHeadersForModal] = useState<
    string[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);

  const effectiveMesRef =
    selectedOption === "__other__"
      ? customMonth
        ? toMonthRef(customMonth)
        : ""
      : selectedOption;

  const isCurrentMonth = effectiveMesRef === currentMesRef;
  const isPastMonth = effectiveMesRef && effectiveMesRef !== currentMesRef;

  const [dataCorte, setDataCorte] = useState(getYesterday());

  useEffect(() => {
    if (!effectiveMesRef) return;
    if (isCurrentMonth) {
      setDataCorte(getYesterday());
    } else {
      setDataCorte(getLastDayOfMonth(effectiveMesRef));
    }
  }, [effectiveMesRef, isCurrentMonth]);

  useEffect(() => {
    if (effectiveMesRef && dataCorte && onDateChange) {
      onDateChange(effectiveMesRef, dataCorte);
    }
  }, [effectiveMesRef, dataCorte, onDateChange]);

  const pastMonths = existingMonths.filter((m) => m !== currentMesRef);

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
        className="elevation-1 space-y-4 rounded-xl p-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="ds-mono-sm text-muted-foreground mb-1 block">
              Mês de referência
            </label>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              disabled={isPending}
              className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
              style={{
                border: "1px solid var(--border)",
                colorScheme: "dark",
              }}
            >
              <option value={currentMesRef}>
                {formatMonthLabel(currentMesRef)} (mês atual)
              </option>
              {pastMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} (passado)
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__other__">Outro mês…</option>
            </select>

            {selectedOption === "__other__" && (
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono date-input-styled mt-2 w-full rounded-md px-3 py-2"
                style={{
                  border: "1px solid var(--border)",
                  colorScheme: "dark",
                }}
              />
            )}
          </div>

          <div>
            <label
              htmlFor="data-corte"
              className="ds-mono-sm text-muted-foreground mb-1 block"
            >
              Dados até o dia
            </label>
            <input
              id="data-corte"
              type="date"
              value={dataCorte}
              onChange={(e) => setDataCorte(e.target.value)}
              min={effectiveMesRef || undefined}
              max={
                isCurrentMonth
                  ? getToday()
                  : effectiveMesRef
                    ? getLastDayOfMonth(effectiveMesRef)
                    : undefined
              }
              disabled={isPending || !effectiveMesRef}
              className="elevation-2 ds-mono date-input-styled w-full rounded-md px-3 py-2"
              style={{
                border: "1px solid var(--border)",
                colorScheme: "dark",
              }}
            />
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.2, ease: EASE_OUT_EXPO }}
        className="elevation-1 space-y-4 rounded-xl p-5"
      >
        <div className="flex items-start gap-2">
          <IconClipboard
            size={18}
            className="text-muted-foreground mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1">
            <label htmlFor="clipboard-textarea" className="ds-body block">
              Cole os dados aqui (Ctrl+V)
            </label>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              Inclua o cabeçalho da planilha junto com as linhas de dados.
            </p>
          </div>
        </div>

        <textarea
          id="clipboard-textarea"
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          disabled={isPending}
          rows={10}
          placeholder="Colaborador&#9;Tx. Retenção...&#10;samyrha.fenix@alloha.com&#9;62.5..."
          className="ds-mono-sm elevation-2 w-full rounded-md px-3 py-2"
          style={{
            border: "1px solid var(--border)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "12px",
            resize: "vertical",
            minHeight: "200px",
          }}
        />

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !effectiveMesRef}
            className="gap-2"
          >
            {isPending && (
              <IconLoader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            {isPending ? "Processando..." : "Processar dados"}
          </Button>
        </div>
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
