"use client";

import {
  IconExternalLink,
  IconHeadphones,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  link: string;
  idChamada: string;
}

export function MonitoriaPlayerCard({ link, idChamada }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-2 relative overflow-hidden rounded-xl p-6"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 left-0 h-[2px]"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, var(--primary) 50%, transparent 100%)",
        }}
      />

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full"
            style={{
              background: "color-mix(in oklch, var(--primary) 18%, transparent)",
              filter: "blur(8px)",
            }}
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in oklch, var(--primary) 14%, transparent)",
              border:
                "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
            }}
          >
            <IconHeadphones
              size={28}
              style={{ color: "var(--primary)" }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="ds-mono-sm text-muted-foreground mb-1 tracking-wider">
            GRAVAÇÃO DA LIGAÇÃO
          </p>
          <p className="ds-h2" style={{ fontSize: "1.05rem" }}>
            ID {idChamada}
          </p>
          <p className="ds-mono-sm text-muted-foreground mt-1">
            Hospedada no OneDrive · abre em nova janela
          </p>
        </div>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-lg px-5 py-3 transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            boxShadow:
              "0 4px 16px color-mix(in oklch, var(--primary) 32%, transparent)",
          }}
        >
          <IconPlayerPlay size={18} aria-hidden="true" fill="currentColor" />
          <span className="ds-body font-medium">Ouvir gravação</span>
          <IconExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </motion.div>
  );
}
