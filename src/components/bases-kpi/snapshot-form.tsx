"use client";

import { useState, useTransition } from "react";
import { IconClipboard, IconLoader2 } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  formatMonthLabel,
  getCurrentMonthRef,
  getToday,
  getYesterday,
} from "@/lib/kpi/bases/format-date";
import {
  processSnapshotAction,
  type ProcessSnapshotResult,
} from "@/lib/kpi/bases/process-snapshot-action";

import { SnapshotResult } from "./snapshot-result";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface SnapshotFormProps {
  onSaved?: () => void;
}

export function SnapshotForm({ onSaved }: SnapshotFormProps) {
  const currentMesRef = getCurrentMonthRef();
  const monthLabel = formatMonthLabel(currentMesRef);

  const [dataCorte, setDataCorte] = useState(getYesterday());
  const [clipboardText, setClipboardText] = useState("");
  const [result, setResult] = useState<ProcessSnapshotResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!clipboardText.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }

    startTransition(async () => {
      const res = await processSnapshotAction({
        clipboardText,
        mesRef: currentMesRef,
        dataCorte,
      });

      setResult(res);

      if (res.success) {
        toast.success("Snapshot processado", {
          description: `${res.totalOperators} operadores salvos`,
        });
        setClipboardText("");
        onSaved?.();
      } else {
        toast.error("Falha ao salvar", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
        className="elevation-1 space-y-4 rounded-xl p-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="ds-mono-sm text-muted-foreground mb-1 block">
              Mês de referência
            </label>
            <div
              className="elevation-2 ds-mono rounded-md px-3 py-2"
              style={{ border: "1px solid var(--border)" }}
            >
              {monthLabel}
            </div>
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
              max={getToday()}
              min={currentMesRef}
              disabled={isPending}
              className="elevation-2 ds-mono date-input-styled w-full rounded-md px-3 py-2"
              style={{
                border: "1px solid var(--border)",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT_EXPO }}
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
            disabled={isPending}
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
    </div>
  );
}
