"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { StyledCard } from "@/components/gestor/styled-card";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Base visual dos avisos do canto inferior esquerdo (comparativo e
 * "KPI atualizado"): toast não-modal, sem overlay/blur, sem ícone. O
 * conteúdo por trás segue visível e interativo.
 *
 * Quem decide se este toast pode aparecer agora é o NotificacoesCantoProvider
 * (só um por vez, comparativo tem prioridade). Este componente só desenha.
 */
export function CornerToast({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -16, y: 8 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
      role="dialog"
      aria-label={ariaLabel}
    >
      <StyledCard className="p-4 space-y-3" withGradient corners="all">
        {children}
      </StyledCard>
    </motion.div>
  );
}
