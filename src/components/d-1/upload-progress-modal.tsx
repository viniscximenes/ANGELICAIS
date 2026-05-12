"use client";

import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import type { UploadStep } from "./upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface UploadProgressModalProps {
  step: UploadStep;
  rowsWritten: number;
}

const STEPS: Array<{
  id: NonNullable<UploadStep>;
  label: string;
  color: string;
}> = [
  { id: "attaching", label: "ANEXANDO", color: "var(--primary)" },
  { id: "deleting", label: "APAGANDO ANTIGA", color: "var(--warning)" },
  { id: "replacing", label: "SUBSTITUINDO", color: "var(--primary)" },
  { id: "done", label: "CONCLUÍDO", color: "var(--success)" },
];

function getStepStatus(
  currentStep: UploadStep,
  stepId: NonNullable<UploadStep>,
): "pending" | "active" | "done" {
  if (!currentStep) return "pending";

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  if (currentIndex > stepIndex) return "done";
  if (currentIndex === stepIndex) return "active";
  return "pending";
}

export function UploadProgressModal({
  step,
  rowsWritten,
}: UploadProgressModalProps) {
  const isOpen = step !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background:
              "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="elevation-3 mx-4 w-full max-w-md rounded-xl p-8"
          >
            <h3 className="ds-h2 mb-1">Atualizando base</h3>
            <p className="ds-small text-muted-foreground mb-8">
              {step === "done"
                ? `${rowsWritten} linhas inseridas com sucesso`
                : "Aguarde enquanto processamos seu arquivo"}
            </p>

            <div className="space-y-3">
              {STEPS.map((s) => {
                const status = getStepStatus(step, s.id);

                return (
                  <motion.div
                    key={s.id}
                    initial={false}
                    animate={{
                      opacity: status === "pending" ? 0.3 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: "28px",
                        height: "28px",
                        background:
                          status === "done"
                            ? "color-mix(in oklch, var(--success) 20%, transparent)"
                            : status === "active"
                              ? `color-mix(in oklch, ${s.color} 20%, transparent)`
                              : "var(--elevation-1-bg)",
                        border: `1px solid ${
                          status === "done"
                            ? "var(--success)"
                            : status === "active"
                              ? s.color
                              : "var(--border)"
                        }`,
                      }}
                    >
                      {status === "done" ? (
                        <IconCheck
                          size={16}
                          style={{ color: "var(--success)" }}
                          aria-hidden="true"
                        />
                      ) : status === "active" ? (
                        <IconLoader2
                          size={16}
                          className="animate-spin"
                          style={{ color: s.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>

                    <span
                      className="ds-mono font-semibold tracking-wider"
                      style={{
                        color:
                          status === "done"
                            ? "var(--success)"
                            : status === "active"
                              ? s.color
                              : "var(--muted-foreground)",
                      }}
                    >
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
