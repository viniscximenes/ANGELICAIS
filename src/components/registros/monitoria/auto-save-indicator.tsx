"use client";

import {
  IconAlertCircle,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  state: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AutoSaveIndicator({ state, lastSavedAt }: Props) {
  return (
    <div
      className="ds-mono-sm mb-2 flex h-5 items-center justify-end"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {state === "saving" && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="text-muted-foreground flex items-center gap-1.5"
          >
            <IconLoader2
              size={12}
              className="animate-spin"
              aria-hidden="true"
            />
            <span>Salvando…</span>
          </motion.div>
        )}

        {state === "saved" && lastSavedAt && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
            style={{ color: "var(--success)" }}
          >
            <IconCheck size={12} aria-hidden="true" />
            <span>Salvo às {formatTime(lastSavedAt)}</span>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
            style={{ color: "var(--danger)" }}
          >
            <IconAlertCircle size={12} aria-hidden="true" />
            <span>Erro ao salvar</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
