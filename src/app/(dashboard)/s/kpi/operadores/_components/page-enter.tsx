"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface PageEnterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Entrada da página — fork LOCAL do PageTransition compartilhado
 * (src/components/motion/page-transition.tsx, NÃO alterado), só pra esta
 * rota: uma única animação (fade + y 6px, 200ms, ease-out). Com
 * `prefers-reduced-motion` ligado, renderiza direto, sem opacity/y — nem
 * um wrapper `motion.div` é montado (evita qualquer custo/objeto de
 * animação desnecessário nesse caso).
 */
export function PageEnter({ children, className }: PageEnterProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
