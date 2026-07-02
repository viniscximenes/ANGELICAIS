"use client";

import { AnimatePresence, motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface ConfirmRecentReportDialogProps {
  open: boolean;
  /** Limite (minutos) que disparou o aviso — ex.: 5. */
  limiteMinutos: number;
  /** Hora "HH:MM" do último report (S2). */
  hora: string;
  /** Nome do supervisor que fez o último report (T2), se gravado. */
  nomeSupervisor: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pop-up da regra dos 5 min: se a última base foi enviada há menos de 5
 * minutos, pede confirmação antes de enviar outra. Nunca bloqueia — só avisa.
 */
export function ConfirmRecentReportDialog({
  open,
  limiteMinutos,
  hora,
  nomeSupervisor,
  onConfirm,
  onCancel,
}: ConfirmRecentReportDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="elevation-3 mx-4 w-full max-w-md rounded-xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ds-h2 mb-1">Enviar outra base?</h3>
            <p className="ds-small text-muted-foreground mb-8">
              {nomeSupervisor
                ? `O supervisor ${nomeSupervisor} fez um report há menos de ${limiteMinutos} minutos (às ${hora}).`
                : `A última base foi enviada há menos de ${limiteMinutos} minutos (às ${hora}).`}{" "}
              Deseja realmente enviar outro?
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="elevation-2 text-muted-foreground hover:text-foreground ds-mono-sm rounded-md px-4 py-2 transition-colors"
                style={{ border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="bg-primary text-primary-foreground ds-mono-sm rounded-md px-4 py-2 transition-opacity hover:opacity-90"
              >
                Enviar mesmo assim
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
