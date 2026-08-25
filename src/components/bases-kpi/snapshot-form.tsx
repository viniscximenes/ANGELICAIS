"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconClipboard,
  IconLoader2,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { StyledCard } from "@/components/gestor/styled-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCurrentMonthRef,
  getLastDayOfMonth,
  getToday,
  getYesterday,
  toMonthRef,
} from "@/lib/kpi/bases/format-date";
import { parseClipboard } from "@/lib/kpi/bases/parse-clipboard";
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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** Preview do paste é só pra conferência visual — trunca pra não pesar o DOM em bases grandes. */
const PREVIEW_MAX_ROWS = 8;

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

  // Mesmo parser usado por processSnapshotAction — o preview mostra
  // exatamente como o servidor vai interpretar as colunas coladas.
  const pastePreview = useMemo(
    () => parseClipboard(clipboardText),
    [clipboardText],
  );

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
              <select
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-full rounded-md px-3 py-2 bg-black/5 dark:bg-black/40 text-foreground focus:outline-none"
                style={{
                  border: "1px solid var(--border)",
                }}
              >
                <option value={currentMesRef}>
                  {formatMonthLabelNumerical(currentMesRef)}
                </option>
                {pastMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabelNumerical(m)}
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
                  className="elevation-2 ds-mono date-input-styled mt-2 w-full rounded-md px-3 py-2 bg-black/5 dark:bg-black/40 text-foreground focus:outline-none"
                  style={{
                    border: "1px solid var(--border)",
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
                className="elevation-2 ds-mono date-input-styled w-full rounded-md px-3 py-2 bg-black/5 dark:bg-black/40 text-foreground focus:outline-none"
                style={{
                  border: "1px solid var(--border)",
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
        </StyledCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.2, ease: EASE_OUT_EXPO }}
      >
        <StyledCard withGradient className="gap-0 space-y-4">
          <div className="flex items-start gap-2">
            <IconClipboard
              size={18}
              className="text-muted-foreground mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1">
              <label htmlFor="clipboard-textarea" className="ds-body font-medium block">
                COLAR KPI DOS OPERADORES
              </label>
            </div>
          </div>

          <textarea
            id="clipboard-textarea"
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            disabled={isPending}
            rows={10}
            placeholder=""
            className="ds-mono-sm elevation-2 w-full rounded-md px-3 py-2 bg-background text-foreground focus:outline-none"
            style={{
              border: "1px solid var(--border)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "12px",
              resize: "vertical",
              minHeight: "200px",
            }}
          />

          {pastePreview && (
            <div className="space-y-2">
              <p className="ds-mono-sm text-muted-foreground">
                Pré-visualização · {pastePreview.rows.length} linha
                {pastePreview.rows.length === 1 ? "" : "s"}
              </p>

              <div className="overflow-hidden rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                      {pastePreview.headers.map((header, idx) => (
                        <TableHead
                          key={idx}
                          className="ds-mono-sm text-muted-foreground px-3 py-2 font-semibold tracking-wider uppercase align-middle leading-none whitespace-nowrap"
                        >
                          {header || `Coluna ${idx + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastePreview.rows.slice(0, PREVIEW_MAX_ROWS).map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="hover:bg-muted/10">
                        {pastePreview.headers.map((_, colIdx) => (
                          <TableCell
                            key={colIdx}
                            className="ds-mono-sm text-foreground px-3 py-2 align-middle whitespace-nowrap"
                          >
                            {row.cells[colIdx] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pastePreview.rows.length > PREVIEW_MAX_ROWS && (
                <p className="ds-mono-sm text-muted-foreground">
                  +{pastePreview.rows.length - PREVIEW_MAX_ROWS} linha
                  {pastePreview.rows.length - PREVIEW_MAX_ROWS === 1 ? "" : "s"} não
                  exibida{pastePreview.rows.length - PREVIEW_MAX_ROWS === 1 ? "" : "s"} no
                  preview.
                </p>
              )}
            </div>
          )}

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
