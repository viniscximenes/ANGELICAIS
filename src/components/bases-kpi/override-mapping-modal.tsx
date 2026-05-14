"use client";

import { useEffect, useState } from "react";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export type MissingKpiInfo = {
  slug: string;
  displayName: string;
  expectedHeader: string;
};

interface OverrideMappingModalProps {
  open: boolean;
  missingKpis: MissingKpiInfo[];
  detectedHeaders: string[];
  onCancel: () => void;
  onReprocess: (overrides: Record<string, string>) => void;
  isPending: boolean;
}

export function OverrideMappingModal({
  open,
  missingKpis,
  detectedHeaders,
  onCancel,
  onReprocess,
  isPending,
}: OverrideMappingModalProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      missingKpis.forEach((k) => {
        initial[k.slug] = "";
      });
      setOverrides(initial);
    }
  }, [open, missingKpis]);

  function handleReprocess() {
    const filtered: Record<string, string> = {};
    for (const [slug, value] of Object.entries(overrides)) {
      const trimmed = value.trim();
      if (trimmed) filtered[slug] = trimmed;
    }

    if (Object.keys(filtered).length === 0) {
      onCancel();
      return;
    }

    onReprocess(filtered);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background:
              "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="elevation-3 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="override-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <IconAlertTriangle
                  size={24}
                  style={{ color: "var(--warning)", flexShrink: 0 }}
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="override-modal-title"
                    className="ds-h2"
                    style={{ fontSize: "1.25rem" }}
                  >
                    Ajustar nomes apenas para esta colagem
                  </h2>
                  <p className="ds-mono-sm text-muted-foreground mt-1">
                    {missingKpis.length} KPI
                    {missingKpis.length === 1 ? "" : "s"} não encontrado
                    {missingKpis.length === 1 ? "" : "s"} no cabeçalho.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                aria-label="Fechar"
              >
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

            <div
              className="mb-4 flex items-start gap-2 rounded-md p-3"
              style={{
                background:
                  "color-mix(in oklch, var(--warning) 10%, transparent)",
                border:
                  "1px solid color-mix(in oklch, var(--warning) 30%, transparent)",
              }}
            >
              <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
                Os nomes editados aqui valem{" "}
                <strong>apenas para esta colagem</strong>. Para alterar
                permanentemente, use Configurações → KPI → Mapeamento.
              </p>
            </div>

            <div className="mb-4 space-y-3">
              {missingKpis.map((kpi) => (
                <div
                  key={kpi.slug}
                  className="elevation-1 space-y-2 rounded-md p-3"
                >
                  <div>
                    <p className="ds-body font-medium">{kpi.displayName}</p>
                    <p className="ds-mono-sm text-muted-foreground">
                      cabeçalho cadastrado:{" "}
                      <span
                        style={{
                          fontFamily:
                            "var(--font-geist-mono), monospace",
                        }}
                      >
                        {kpi.expectedHeader}
                      </span>
                    </p>
                  </div>
                  <input
                    type="text"
                    value={overrides[kpi.slug] ?? ""}
                    onChange={(e) =>
                      setOverrides({
                        ...overrides,
                        [kpi.slug]: e.target.value,
                      })
                    }
                    disabled={isPending}
                    placeholder="Digite o nome do cabeçalho exatamente como aparece na sua planilha"
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{
                      border: "1px solid var(--border)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              ))}
            </div>

            <details className="mb-4">
              <summary className="ds-mono-sm text-muted-foreground hover:text-foreground cursor-pointer">
                Ver cabeçalhos detectados na planilha ({detectedHeaders.length})
              </summary>
              <div className="elevation-2 mt-3 max-h-48 overflow-y-auto rounded-md p-3">
                <ol className="space-y-0.5">
                  {detectedHeaders.map((h, idx) => (
                    <li
                      key={idx}
                      className="ds-mono-sm"
                      style={{ wordBreak: "break-word", fontSize: "11px" }}
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleReprocess}
                disabled={isPending}
              >
                {isPending ? "Reprocessando..." : "Reprocessar com estes nomes"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
