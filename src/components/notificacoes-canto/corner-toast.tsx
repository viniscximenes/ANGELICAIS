"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";

import { StyledCard } from "@/components/gestor/styled-card";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const LOG = "[CornerToast]";

/** transform/filter/perspective/contain/will-change num ancestral tornam o
 * elemento o containing block de `position: fixed` (em vez da viewport). */
function quebraFixed(s: CSSStyleDeclaration): boolean {
  return (
    s.transform !== "none" ||
    s.perspective !== "none" ||
    s.filter !== "none" ||
    (s.backdropFilter && s.backdropFilter !== "none") ||
    /transform|perspective|filter/.test(s.willChange || "") ||
    /paint|layout|strict|content/.test(s.contain || "")
  );
}

function descreve(el: HTMLElement): string {
  const cls = Array.from(el.classList).join(".");
  return el.tagName.toLowerCase() + (cls ? `.${cls}` : "");
}

/**
 * Base visual dos avisos do canto inferior esquerdo (comparativo e
 * "KPI atualizado"): toast não-modal, sem overlay/blur, sem ícone. O
 * conteúdo por trás segue visível e interativo.
 *
 * Quem decide se este toast pode aparecer agora é o NotificacoesCantoProvider
 * (só um por vez, comparativo tem prioridade). Este componente só desenha.
 *
 * Todas as classes são estáticas e completas (nada de template string /
 * classe composta em runtime) pra o scanner do Tailwind v4 gerar o CSS.
 */
export function CornerToast({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Diagnóstico de render/CSS — roda no mesmo burst de log do provider.
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      console.warn(`${LOG} montou mas ref está null.`);
      return;
    }

    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    console.info(`${LOG} MONTADO`, {
      className: el.className,
      rect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      self: {
        position: cs.position,
        transform: cs.transform,
        zIndex: cs.zIndex,
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        pointerEvents: cs.pointerEvents,
        clipPath: cs.clipPath,
        overflow: cs.overflow,
      },
    });

    // Sobe a árvore até o body, listando ancestrais que quebram
    // position:fixed ou que podem clipar o toast (overflow != visible).
    const ancestrais: Array<Record<string, string>> = [];
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const s = getComputedStyle(node);
      if (quebraFixed(s) || s.overflow !== "visible") {
        ancestrais.push({
          el: descreve(node),
          position: s.position,
          transform: s.transform,
          perspective: s.perspective,
          filter: s.filter,
          backdropFilter: s.backdropFilter,
          willChange: s.willChange,
          contain: s.contain,
          overflow: s.overflow,
        });
      }
      node = node.parentElement;
    }

    if (ancestrais.length) {
      console.warn(
        `${LOG} ancestrais que quebram position:fixed ou clipam o toast ` +
          `(o de cima é o containing block efetivo):`,
        ancestrais,
      );
    } else {
      console.info(
        `${LOG} nenhum ancestral com transform/filter/perspective/contain/` +
          `will-change ou overflow!=visible até o body — fixed resolve na viewport.`,
      );
    }

    // Segunda medição depois da animação de entrada (200ms): distingue
    // "preso em opacity:0 / fora da viewport" de "só estava no meio da
    // animação no mount".
    const t = setTimeout(() => {
      if (!ref.current) return;
      const r2 = ref.current.getBoundingClientRect();
      const cs2 = getComputedStyle(ref.current);
      const dentroDaViewport =
        r2.bottom > 0 &&
        r2.right > 0 &&
        r2.top < window.innerHeight &&
        r2.left < window.innerWidth;
      console.info(`${LOG} +300ms`, {
        rect: { top: r2.top, left: r2.left, width: r2.width, height: r2.height },
        opacity: cs2.opacity,
        visibility: cs2.visibility,
        transform: cs2.transform,
        position: cs2.position,
        dentroDaViewport,
      });
    }, 300);

    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      ref={ref}
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
