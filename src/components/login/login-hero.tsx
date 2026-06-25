"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function LoginHero() {
  return (
    <div className="relative flex h-[40vh] flex-col items-center justify-center lg:h-screen">
      <div className="relative z-10 flex flex-col items-center justify-center -space-y-32 -mt-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
          className="flex items-center justify-center"
        >
          <Image 
            src="/alloha-fibra.png" 
            alt="Alloha Fibra Logo" 
            width={400} 
            height={400}
            priority
            className="object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT_EXPO }}
          className="text-center"
        >
          <p className="ds-body text-muted-foreground font-mono tracking-widest uppercase text-[10px] opacity-80">
            Sistema de gestão operacional
          </p>
        </motion.div>
      </div>
    </div>
  );
}
