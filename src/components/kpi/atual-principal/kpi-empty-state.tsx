"use client";

import { IconChartBar } from "@tabler/icons-react";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface KpiEmptyStateProps {
  title?: string;
  description?: string;
}

export function KpiEmptyState({
  title = "Sem dados de KPI para este mês",
  description = "Fale com seu administrador.",
}: KpiEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 rounded-xl p-16 text-center"
      role="status"
    >
      <IconChartBar
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
