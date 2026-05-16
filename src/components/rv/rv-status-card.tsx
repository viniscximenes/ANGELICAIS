"use client";

import { motion } from "framer-motion";

import type { RvCalculation } from "@/lib/rv/calc-types";
import { formatBRL } from "@/lib/rv/format-money";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  calculation: RvCalculation;
}

export function RvStatusCard({ calculation }: Props) {
  const bonusBloqueado = calculation.valorTravadoImpossivel > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
      className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 left-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent 0%, var(--primary) 50%, transparent 100%)`,
        }}
      />

      <p className="ds-small text-muted-foreground mb-3 tracking-wider">
        RV ESTIMADA
      </p>

      <p className="ds-display">{formatBRL(calculation.liquido)}</p>

      <div className="ds-mono-sm text-muted-foreground mt-3 space-y-1">
        <p>
          Teto possível:{" "}
          <span style={{ color: "var(--foreground)" }}>
            {formatBRL(calculation.tetoPossivel)}
          </span>
        </p>

        {bonusBloqueado && (
          <p style={{ color: "var(--warning)" }}>
            Você travou {formatBRL(calculation.valorTravadoImpossivel)} que não
            podem mais ser recuperados.
          </p>
        )}

        <p className="mt-3 italic">
          ⚠ Estimativa. O valor oficial é o calculado pela empresa.
        </p>
      </div>
    </motion.div>
  );
}
