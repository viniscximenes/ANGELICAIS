"use client";

import { motion } from "framer-motion";

import { AnimatedOrb } from "./animated-orb";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function LoginHero() {
  return (
    <div className="relative flex h-[40vh] flex-col items-center justify-center lg:h-screen">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2, ease: EASE_OUT_EXPO }}
        className="relative z-0"
      >
        <AnimatedOrb />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
        className="relative z-10 mt-4 flex flex-col items-center px-6 text-center"
        style={{ textShadow: "0 2px 24px var(--background)" }}
      >
        <h1 className="ds-display">ANGELICAIS</h1>
        <p className="ds-body text-muted-foreground mt-2">
          Sistema de gestão operacional
        </p>
      </motion.div>
    </div>
  );
}
