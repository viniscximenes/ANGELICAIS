"use client";

import { IconReceipt2 } from "@tabler/icons-react";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  title?: string;
  description?: string;
}

export function RvEmptyState({
  title = "Sem dados de KPI para este mês",
  description = "Não é possível calcular RV sem o snapshot do KPI. Fale com seu administrador.",
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="elevation-1 rounded-xl p-16 text-center"
      role="status"
    >
      <IconReceipt2
        size={48}
        className="text-muted-foreground mx-auto mb-4"
        aria-hidden="true"
      />
      <h2 className="ds-h2 mb-2">{title}</h2>
      <p className="ds-body text-muted-foreground mx-auto max-w-md">
        {description}
      </p>
    </motion.div>
  );
}
