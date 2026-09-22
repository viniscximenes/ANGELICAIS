"use client";

import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Etapas REAIS de TmaUploadDropzone.handleFile — cada uma corresponde a uma
 * chamada de verdade no código, não a um fluxo inventado:
 *   1. "reading-roster" → getTmaRosterAction() (busca o roster pra o
 *      matching client-side).
 *   2. "parsing" → parseTmaNoClient(file, roster) (parse do CSV + matching
 *      + agregação, tudo no navegador).
 *   3. "uploading" → uploadTmaAction(payload) (grava d1_tma +
 *      d1_tma_atendimentos no servidor).
 *   4. "done" → sucesso confirmado pela Server Action.
 * SEM etapa de "apagando base antiga"/"substituindo": uploadTmaAction faz
 * upsert (por data_ref+operator_email / data_ref+call_segment_id), não
 * delete+insert como o Consolidado — replicar aquelas etapas aqui mentiria
 * sobre o que o backend da TMA realmente faz.
 */
export type TmaUploadStep = "reading-roster" | "parsing" | "uploading" | "done" | null;

interface TmaUploadProgressModalProps {
  step: TmaUploadStep;
  /** Resumo da etapa "done" — ex.: "142 atendimentos válidos · 18 operadores". */
  resumoFinal: string | null;
}

const STEPS: Array<{
  id: NonNullable<TmaUploadStep>;
  label: string;
  description: string;
  color: string;
}> = [
  {
    id: "reading-roster",
    label: "Lendo roster",
    description: "Buscando os operadores cadastrados da sua equipe",
    color: "var(--primary)",
  },
  {
    id: "parsing",
    label: "Processando CSV",
    description: "Lendo o arquivo e cruzando com o roster no navegador",
    color: "var(--primary)",
  },
  {
    id: "uploading",
    label: "Enviando",
    description: "Gravando os atendimentos no servidor",
    color: "var(--primary)",
  },
  {
    id: "done",
    label: "Concluído",
    description: "TMA atualizado com sucesso",
    color: "var(--success)",
  },
];

function getStepStatus(
  currentStep: TmaUploadStep,
  stepId: NonNullable<TmaUploadStep>,
): "pending" | "active" | "done" {
  if (!currentStep) return "pending";

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  if (currentIndex > stepIndex) return "done";
  if (currentIndex === stepIndex) return "active";
  return "pending";
}

/**
 * Modal de progresso do upload da TMA — MESMA estrutura visual de
 * UploadProgressModal (d-1/upload-progress-modal.tsx: backdrop com blur,
 * card central com scale/opacity/y de entrada, barra de progresso animada,
 * timeline vertical com círculo/brilho na etapa ativa, spinner→check
 * animado), copiada literalmente (mesmas classes/tokens/durações/easing) —
 * SEM importar nem editar o componente original, só com as etapas
 * (STEPS acima) e os textos trocados pro fluxo real da TMA.
 */
export function TmaUploadProgressModal({ step, resumoFinal }: TmaUploadProgressModalProps) {
  const isOpen = step !== null;
  const currentIndex = step ? STEPS.findIndex((s) => s.id === step) : -1;
  // +1 pra já mostrar progresso ao entrar na primeira etapa, em vez de 0%.
  const progressPct = currentIndex >= 0 ? ((currentIndex + 1) / STEPS.length) * 100 : 0;

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
            background: "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="elevation-3 mx-4 w-full max-w-md rounded-2xl p-9"
          >
            <h3 className="ds-h2 mb-1.5">Processando relatório de voz</h3>
            <p className="ds-small text-muted-foreground mb-7">
              {step === "done"
                ? (resumoFinal ?? "TMA atualizado com sucesso")
                : "Aguarde enquanto processamos seu arquivo"}
            </p>

            <div
              className="mb-8 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--elevation-1-bg)" }}
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
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
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
                        animate={{ scale: status === "active" ? 1.06 : 1 }}
                        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
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
                            status === "done" ? "var(--success)" : status === "active" ? s.color : "var(--border)"
                          }`,
                          boxShadow:
                            status === "active"
                              ? `0 0 14px color-mix(in oklch, ${s.color} 35%, transparent)`
                              : "none",
                          transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
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
                              <IconCheck size={15} style={{ color: "var(--success)" }} aria-hidden="true" />
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
                                className="animate-spin"
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
                            background: status === "done" ? "var(--success)" : "var(--border)",
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
                        className="ds-mono font-semibold tracking-wide"
                        style={{
                          color:
                            status === "done" ? "var(--success)" : status === "active" ? s.color : "var(--foreground)",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {s.label}
                      </p>
                      <p className="ds-mono-sm text-muted-foreground/70 mt-0.5 text-[11px]">{s.description}</p>
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
