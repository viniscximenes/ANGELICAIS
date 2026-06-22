"use client";

import { useState, useTransition } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconClipboard,
  IconLoader2,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDateBR, formatMonthLabel } from "@/lib/kpi/bases/format-date";
import {
  processGestorSnapshotAction,
  type ProcessGestorSnapshotResult,
} from "@/lib/kpi/bases/process-gestor-snapshot-action";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface GestorSnapshotFormProps {
  mesRef: string;
  dataCorte: string;
}

export function GestorSnapshotForm({
  mesRef,
  dataCorte,
}: GestorSnapshotFormProps) {
  const [clipboardText, setClipboardText] = useState("");
  const [result, setResult] = useState<ProcessGestorSnapshotResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!clipboardText.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }
    startTransition(async () => {
      const res = await processGestorSnapshotAction({
        clipboardText,
        mesRef,
        dataCorte,
      });
      setResult(res);
      if (res.success) {
        toast.success("Base de supervisores salva", {
          description: `${res.totalSupervisors} supervisor(es) processado(s)`,
        });
        setClipboardText("");
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
        transition={{ delay: 0.1, duration: 0.2, ease: EASE_OUT_EXPO }}
        className="elevation-1 space-y-4 rounded-xl p-5"
      >
        <p className="ds-mono-sm text-muted-foreground">
          Mês herdado:{" "}
          <span className="text-foreground font-medium">
            {mesRef ? formatMonthLabel(mesRef) : "—"}
          </span>
          {dataCorte && (
            <>
              {" · dados até "}
              <span className="text-foreground font-medium">
                {formatDateBR(dataCorte)}
              </span>
            </>
          )}
        </p>

        <div className="flex items-start gap-2">
          <IconClipboard
            size={18}
            className="text-muted-foreground mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1">
            <label
              htmlFor="gestor-clipboard-textarea"
              className="ds-body block"
            >
              Cole os dados aqui (Ctrl+V)
            </label>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              Inclua o cabeçalho. 1ª coluna: Supervisor (nome completo).
            </p>
          </div>
        </div>

        <textarea
          id="gestor-clipboard-textarea"
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          disabled={isPending}
          rows={8}
          placeholder={"Supervisor\tPedidos\tChurn\t..."}
          className="ds-mono-sm elevation-2 w-full rounded-md px-3 py-2"
          style={{
            border: "1px solid var(--border)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "12px",
            resize: "vertical",
            minHeight: "160px",
          }}
        />

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !mesRef}
            className="gap-2"
          >
            {isPending && (
              <IconLoader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            {isPending ? "Processando..." : "Processar base de supervisores"}
          </Button>
        </div>
      </motion.div>

      {result && <GestorResult result={result} />}
    </div>
  );
}

function GestorResult({
  result,
}: {
  result: ProcessGestorSnapshotResult;
}) {
  if (!result.success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
        className="elevation-1 rounded-xl p-5"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <IconAlertCircle
            size={20}
            style={{ color: "var(--danger)" }}
            aria-hidden="true"
          />
          <div>
            <p className="ds-body font-medium">Falha ao processar</p>
            <p className="ds-small text-muted-foreground mt-1">{result.error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="elevation-1 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <IconCheck
            size={20}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="ds-body font-medium">Snapshot de supervisores salvo</p>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              {result.totalSupervisors} supervisor
              {result.totalSupervisors === 1 ? "" : "es"} processado
              {result.totalSupervisors === 1 ? "" : "s"}
            </p>

            {result.monthsDeleted.length > 0 && (
              <p
                className="ds-mono-sm mt-2"
                style={{ color: "var(--warning)" }}
              >
                Meses antigos apagados (retenção):{" "}
                {result.monthsDeleted.join(", ")}
              </p>
            )}

            {result.supervisors.length > 0 && (
              <details className="mt-3">
                <summary className="ds-mono-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Ver supervisores salvos ({result.supervisors.length})
                </summary>
                <ul className="mt-2 space-y-0.5">
                  {result.supervisors.map((name) => (
                    <li key={name} className="ds-mono-sm text-muted-foreground">
                      • {name}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>

      {result.missingKpis.length > 0 && (
        <div className="elevation-1 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <IconAlertCircle
              size={20}
              style={{ color: "var(--warning)" }}
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="ds-body font-medium">
                KPIs não encontrados ({result.missingKpis.length})
              </p>
              <p className="ds-mono-sm text-muted-foreground mt-1 mb-3">
                Verifique se os cabeçalhos da planilha conferem com os
                mapeamentos em Configurações → KPI.
              </p>
              <ul className="space-y-1">
                {result.missingKpis.map((name) => (
                  <li key={name} className="ds-mono-sm text-muted-foreground">
                    • {name}
                  </li>
                ))}
              </ul>

              <div className="elevation-2 mt-4 space-y-1.5 rounded-md p-3">
                <p className="ds-mono-sm font-semibold">Debug do parser:</p>
                <p className="ds-mono-sm text-muted-foreground">
                  Separador:{" "}
                  <span className="text-foreground">
                    {result.debugInfo.separator}
                  </span>
                </p>
                <p className="ds-mono-sm text-muted-foreground">
                  Cabeçalhos lidos:{" "}
                  <span className="text-foreground">
                    {result.debugInfo.totalHeaders}
                  </span>
                </p>
                <pre
                  className="ds-mono-sm elevation-1 overflow-x-auto rounded p-2"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    fontSize: "11px",
                  }}
                >
                  {result.debugInfo.rawFirstLineSample}
                </pre>
              </div>

              <details className="mt-4">
                <summary className="ds-mono-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Ver cabeçalhos detectados ({result.detectedHeaders.length})
                </summary>
                <div className="elevation-2 mt-3 max-h-60 overflow-y-auto rounded-md p-3">
                  <ol className="space-y-0.5">
                    {result.detectedHeaders.map((h, idx) => (
                      <li
                        key={idx}
                        className="ds-mono-sm"
                        style={{ wordBreak: "break-word" }}
                      >
                        <span className="text-muted-foreground">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>{" "}
                        {h || "(vazio)"}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="elevation-1 rounded-xl p-5">
          <p className="ds-body mb-2 font-medium">Avisos</p>
          <ul className="space-y-0.5">
            {result.warnings.map((w, idx) => (
              <li key={idx} className="ds-mono-sm text-muted-foreground">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
