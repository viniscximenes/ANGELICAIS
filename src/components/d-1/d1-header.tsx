"use client";

import { IconClock } from "@tabler/icons-react";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface D1HeaderProps {
  horaReport: string;
}

export function D1Header({ horaReport }: D1HeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="ds-h1">D-1</h1>
        <span className="ds-mono-sm text-muted-foreground">
          / dia atual · consolidado
        </span>
      </div>
      <div className="ds-small text-muted-foreground flex items-center gap-2">
        <IconClock size={14} aria-hidden="true" />
        <span>Atualizado às {horaReport}</span>
      </div>
    </motion.div>
  );
}
