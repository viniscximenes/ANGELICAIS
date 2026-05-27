"use client";

import { motion } from "framer-motion";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";
import { CopyIndispPausasButton } from "./copy-indisp-pausas-button";
import { IndispPausasTable } from "./indisp-pausas-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface IndispPausasSectionProps {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
}

export function IndispPausasSection({
  operadoresIndisp,
  operadoresPausa,
}: IndispPausasSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="ds-mono text-muted-foreground">04</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Detalhamento de pausas</h2>
          </div>
          <CopyIndispPausasButton />
        </div>

        {/*
          Wrapper INVISÍVEL usado SÓ pela captura do PNG (variant excel).
          Vive off-screen pra não afetar o layout normal.
        */}
        <div
          data-indisp-pausas-png-wrapper
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
            width: "1200px",
          }}
        >
          <IndispPausasTable
            key="indisp-pausas-png"
            operadoresIndisp={operadoresIndisp}
            operadoresPausa={operadoresPausa}
            variant="excel"
          />
        </div>

        <IndispPausasTable
          key="indisp-pausas-visible"
          operadoresIndisp={operadoresIndisp}
          operadoresPausa={operadoresPausa}
        />
      </div>
    </motion.section>
  );
}
