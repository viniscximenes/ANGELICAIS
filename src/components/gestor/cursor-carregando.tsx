"use client";

import { useEffect, useRef } from "react";

/**
 * Indicador de carregamento ao lado do cursor em /s/reports/consolidado e
 * /s/reports/tma-peso (TmaTable) — no lugar do cursor "progress" do sistema
 * (bolinha azul do Windows) enquanto o detalhe do operador é buscado. O cursor normal continua
 * visível; um spinner circular simples, na cor do texto (branco no tema
 * escuro), acompanha o mouse à direita da seta, na altura da ponta.
 */

const TAMANHO = 16;
/** Distância da ponta do cursor até o spinner (à direita, na altura da ponta da seta). */
const DESLOCAMENTO = { x: 16, y: -2 };

export function CursorCarregando({ inicial }: { inicial: { x: number; y: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function mover(x: number, y: number) {
      if (ref.current) {
        ref.current.style.transform = `translate(${x + DESLOCAMENTO.x}px, ${y + DESLOCAMENTO.y}px)`;
        ref.current.style.opacity = "1";
      }
    }
    if (inicial) mover(inicial.x, inicial.y);

    function handleMove(e: PointerEvent) {
      mover(e.clientX, e.clientY);
    }
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [inicial]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[200]"
      style={{ opacity: 0, width: TAMANHO, height: TAMANHO }}
    >
      <svg
        width={TAMANHO}
        height={TAMANHO}
        viewBox="0 0 16 16"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: "0.7s" }}
      >
        <circle cx="8" cy="8" r="6" stroke="var(--foreground)" strokeOpacity="0.2" strokeWidth="2" />
        <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
