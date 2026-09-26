"use client";

import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { UploadStep } from "./upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface UploadProgressModalProps {
  step: UploadStep;
  rowsWritten: number;
  /**
   * Variante visual — aditiva, default "default" preserva o visual EXATO de
   * hoje (usado por upload-tempo-logado-dropzone.tsx, sem passar a prop).
   * "reports-consolidado" é usada só por upload-dropzone.tsx (exclusivo de
   * /reports/consolidado): aplica `data-page="reports-consolidado"` no
   * backdrop (mesma técnica de escopo de CSS já usada em outros overlays
   * desta série, mesmo o componente não sendo um portal de verdade — ele já
   * renderiza dentro da árvore da página via position:fixed, então herdaria
   * as CSS vars do tema mesmo sem o atributo; ele é reforçado aqui só pra
   * seguir o mesmo padrão e permitir seletores CSS explícitos em
   * reports-consolidado.css) e troca classes/tokens genéricos
   * (elevation-3, ds-h2, ds-mono) pelas classes do tema Zen Linen definidas
   * em reports-consolidado.css. A lógica de etapas (STEPS/getStepStatus) e
   * a acessibilidade (aria-live/role=status, prefers-reduced-motion) são
   * IDÊNTICAS nas duas variantes — só a casca visual muda.
   */
  variant?: "default" | "reports-consolidado";
}

const STEPS: Array<{
  id: NonNullable<UploadStep>;
  label: string;
  description: string;
  color: string;
}> = [
  {
    id: "attaching",
    label: "Anexando",
    description: "Lendo e validando o arquivo CSV",
    color: "var(--primary)",
  },
  {
    id: "deleting",
    label: "Apagando base antiga",
    description: "Removendo os dados do dia atual",
    color: "var(--warning)",
  },
  {
    id: "replacing",
    label: "Substituindo",
    description: "Gravando os novos registros",
    color: "var(--primary)",
  },
  {
    id: "done",
    label: "Concluído",
    description: "Base atualizada com sucesso",
    color: "var(--success)",
  },
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
  variant = "default",
}: UploadProgressModalProps) {
  const isConsolidado = variant === "reports-consolidado";
  const isOpen = step !== null;
  const currentIndex = step ? STEPS.findIndex((s) => s.id === step) : -1;
  // +1 pra já mostrar progresso ao entrar na primeira etapa, em vez de 0%.
  const progressPct =
    currentIndex >= 0 ? ((currentIndex + 1) / STEPS.length) * 100 : 0;

  // prefers-reduced-motion: zera as transições de entrada/saída e a
  // animação do spinner (a barra de progresso e o preenchimento dos
  // círculos continuam mudando de estado, só sem a animação de movimento).
  const prefersReducedMotion = useReducedMotion();
  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: EASE_OUT_EXPO };
  const cardTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: EASE_OUT_EXPO };

  const currentStepLabel = step
    ? STEPS.find((s) => s.id === step)?.label ?? "Atualizando base"
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          data-page={isConsolidado ? "reports-consolidado" : undefined}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background:
              "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
            transition={cardTransition}
            role="status"
            aria-live="polite"
            className={
              isConsolidado
                ? "reports-consolidado-upload-modal mx-4 w-full max-w-md rounded-2xl p-9"
                : "elevation-3 mx-4 w-full max-w-md rounded-2xl p-9"
            }
          >
            <h3 className={isConsolidado ? "ds-h3 mb-1.5" : "ds-h2 mb-1.5"}>
              Atualizando base
            </h3>
            <p className={`${isConsolidado ? "ds-body" : "ds-small"} text-muted-foreground mb-7`}>
              {step === "done"
                ? `${rowsWritten} linhas inseridas com sucesso`
                : "Aguarde enquanto processamos seu arquivo"}
            </p>
            <span className="sr-only">
              {step === "done"
                ? `Base atualizada com sucesso: ${rowsWritten} linhas inseridas.`
                : `Atualizando base, etapa atual: ${currentStepLabel}.`}
            </span>

            <div
              className="mb-8 h-1.5 w-full overflow-hidden rounded-full"
              style={{
                background: isConsolidado ? "var(--muted, var(--border))" : "var(--elevation-1-bg)",
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    step === "done"
                      ? "var(--success)"
                      : "linear-gradient(90deg, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--success)))",
                }}
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.5, ease: EASE_OUT_EXPO }
                }
              />
            </div>

            <div>
              {STEPS.map((s, i) => {
                const status = getStepStatus(step, s.id);
                const isLast = i === STEPS.length - 1;

                return (
                  <div key={s.id} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="relative flex shrink-0 items-center justify-center rounded-full"
                        initial={false}
                        animate={{ scale: prefersReducedMotion ? 1 : status === "active" ? 1.06 : 1 }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.3, ease: EASE_OUT_EXPO }
                        }
                        style={{
                          width: "30px",
                          height: "30px",
                          background:
                            status === "done"
                              ? "color-mix(in oklch, var(--success) 18%, transparent)"
                              : status === "active"
                                ? `color-mix(in oklch, ${s.color} 18%, transparent)`
                                : "var(--elevation-1-bg)",
                          border: `1.5px solid ${
                            status === "done"
                              ? "var(--success)"
                              : status === "active"
                                ? s.color
                                : "var(--border)"
                          }`,
                          boxShadow:
                            status === "active"
                              ? `0 0 14px color-mix(in oklch, ${s.color} 35%, transparent)`
                              : "none",
                          transition:
                            "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                        }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {status === "done" ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                              className="flex items-center justify-center"
                            >
                              <IconCheck
                                size={15}
                                style={{ color: "var(--success)" }}
                                aria-hidden="true"
                              />
                            </motion.span>
                          ) : status === "active" ? (
                            <motion.span
                              key="spinner"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                              className="flex items-center justify-center"
                            >
                              <IconLoader2
                                size={15}
                                className="animate-spin motion-reduce:animate-none"
                                style={{ color: s.color }}
                                aria-hidden="true"
                              />
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </motion.div>

                      {!isLast && (
                        <div
                          className="w-px flex-1"
                          style={{
                            minHeight: "24px",
                            background:
                              status === "done" ? "var(--success)" : "var(--border)",
                            transition: "background 0.4s ease",
                          }}
                        />
                      )}
                    </div>

                    <motion.div
                      initial={false}
                      animate={{ opacity: status === "pending" ? 0.4 : 1 }}
                      transition={{ duration: 0.3 }}
                      className={isLast ? "pb-0.5" : "pb-5"}
                    >
                      <p
                        className={
                          isConsolidado
                            ? "ds-body font-semibold"
                            : "ds-mono font-semibold tracking-wide"
                        }
                        style={{
                          color:
                            status === "done"
                              ? "var(--success)"
                              : status === "active"
                                ? s.color
                                : "var(--foreground)",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {s.label}
                      </p>
                      <p
                        className={
                          isConsolidado
                            ? "ds-small text-muted-foreground/70 mt-0.5"
                            : "ds-mono-sm text-muted-foreground/70 mt-0.5 text-[11px]"
                        }
                      >
                        {s.description}
                      </p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
