"use client";

import { motion } from "framer-motion";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";
import { CopyIndispEquipeButton } from "./copy-indisp-equipe-button";
import { IndispEquipeTable } from "./indisp-equipe-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface IndispEquipeSectionProps {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}

export function IndispEquipeSection({
  operadoresIndisp,
  operadoresPausa,
}: IndispEquipeSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div style={{ maxWidth: "780px" }} className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="ds-mono text-muted-foreground">03</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Equipe</h2>
          </div>
          <CopyIndispEquipeButton />
        </div>

        <IndispEquipeTable
          operadoresIndisp={operadoresIndisp}
          operadoresPausa={operadoresPausa}
        />
      </div>
    </motion.section>
  );
}
