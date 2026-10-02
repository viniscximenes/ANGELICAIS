"use client";

import { useState, useTransition } from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { useFaviconLoading } from "@/lib/favicon/use-favicon-loading";
import {
  processGestorSnapshotAction,
  type ProcessGestorSnapshotResult,
} from "@/lib/kpi/bases/process-gestor-snapshot-action";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface GestorSnapshotFormProps {
  dataCorte: string;
  /** Mês de referência — derivado da data de corte ("YYYY-MM-01"). */
  effectiveMesRef: string;
  isPastMonth: boolean;
}

export function GestorSnapshotForm({
  dataCorte,
  effectiveMesRef,
  isPastMonth,
}: GestorSnapshotFormProps) {
  const [clipboardText, setClipboardText] = useState("");
  const [result, setResult] = useState<ProcessGestorSnapshotResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  // Favicon animado ("carregando") durante o upload — mesmo padrão de
  // snapshot-form.tsx (operadores).
  useFaviconLoading(isPending);

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
      const res = await processGestorSnapshotAction({
        clipboardText,
        mesRef: effectiveMesRef,
        dataCorte,
      });
      setResult(res);
      if (res.success) {
        toast.success("Base de gestores salva", {
          description: `${res.totalSupervisors} gestor(es) processado(s)`,
        });
        setClipboardText("");
      } else {
        toast.error("Falha ao salvar", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Data de corte fica na linha de controles (BasesKpiCards); aqui só o
          aviso de mês fechado, renderizado apenas quando se aplica. */}
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

      {/* Sem animação de entrada: depois do skeleton o campo só aparece. */}
      <div>
        {/* Sem título: o próprio campo explica o que fazer (placeholder) e o
            botão de envio fica dentro dele, no canto inferior direito. */}
        <div className="relative">
          <textarea
            id="gestor-clipboard-textarea"
            aria-label="Colar KPI de gestores"
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="Cole aqui a base de KPI de gestores (Ctrl+V)"
            className="bases-kpi-colar font-sans placeholder:text-muted-foreground/70 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 pt-3 pb-12 text-sm text-foreground disabled:opacity-60"
            style={{ resize: "none", minHeight: "120px" }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !effectiveMesRef}
            className="font-sans bg-primary text-primary-foreground absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-opacity cursor-pointer select-none hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending && (
              <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            {isPending ? "Processando..." : "Enviar dados"}
          </button>
        </div>
      </div>

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
        role="alert"
      >
        <div>
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
      <div>
        <div className="flex items-start gap-3">
          <IconCheck
            size={20}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="ds-body font-medium">Snapshot de gestores salvo</p>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              {result.totalSupervisors} gestor
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
                  Ver gestores salvos ({result.supervisors.length})
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
        <div>
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
        <div>
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
