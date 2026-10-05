"use client";

import { ScrollProgress } from "@/components/core/scroll-progress";

/** Indicador da rolagem da página, fixo logo abaixo do header do dashboard. */
export function ConsolidadoScrollProgress() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-[60px] right-0 left-0 z-40 h-0.5 bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] lg:left-[240px]"
    >
      <ScrollProgress
        className="absolute h-0.5 bg-[linear-gradient(to_right,rgba(0,0,0,0),var(--foreground)_75%,var(--foreground)_100%)]"
        springOptions={{
          stiffness: 280,
          damping: 18,
          mass: 0.3,
        }}
      />
    </div>
  );
}
