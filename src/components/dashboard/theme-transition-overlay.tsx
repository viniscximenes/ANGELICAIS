"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IconLoader2 } from "@tabler/icons-react";

import { useTheme } from "./theme-provider";

const FADE_IN_DURATION = 0.18;
const FADE_OUT_DURATION = 0.22;

interface Props {
  onEntered: () => void;
  onExited: () => void;
}

// Cor do overlay e do texto são fixadas pelo tema de DESTINO (pendingTheme),
// não pelas CSS vars do tema atual — evita "flicker" no próprio loader no
// instante em que a troca de tema acontece por baixo do blur.
export function ThemeTransitionOverlay({ onEntered, onExited }: Props) {
  const { overlayVisible, pendingTheme } = useTheme();
  const isGoingLight = pendingTheme === "light";

  return (
    <AnimatePresence onExitComplete={onExited}>
      {overlayVisible && (
        <motion.div
          key="theme-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: FADE_IN_DURATION, ease: "easeOut" },
          }}
          exit={{
            opacity: 0,
            transition: { duration: FADE_OUT_DURATION, ease: "easeIn" },
          }}
          onAnimationComplete={onEntered}
          className="pointer-events-auto fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3"
          style={{
            background: isGoingLight
              ? "rgba(255, 255, 255, 0.6)"
              : "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          role="status"
          aria-live="polite"
        >
          <IconLoader2
            size={36}
            className={
              isGoingLight
                ? "animate-spin text-zinc-900"
                : "animate-spin text-zinc-50"
            }
            aria-hidden="true"
          />
          <p
            className={
              isGoingLight ? "ds-small text-zinc-900" : "ds-small text-zinc-50"
            }
          >
            {isGoingLight ? "Aplicando tema claro..." : "Aplicando tema escuro..."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
