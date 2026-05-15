"use client";

import { IconBan } from "@tabler/icons-react";
import { motion } from "framer-motion";

import type { RvCalculation } from "@/lib/rv/calc-types";
import { formatBRL } from "@/lib/rv/format-money";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  calculation: RvCalculation;
}

export function RvImpossibleBlock({ calculation }: Props) {
  const impossiveis = calculation.combinedBonusResults.filter(
    (cb) => !cb.ainda_possivel,
  );

  if (impossiveis.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.59, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="elevation-1 space-y-3 rounded-xl p-5"
      style={{ borderLeft: "3px solid var(--warning)" }}
    >
      <div className="flex items-center gap-2">
        <IconBan
          size={18}
          style={{ color: "var(--warning)" }}
          aria-hidden="true"
        />
        <h3 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Indisponível este mês
        </h3>
      </div>

      <div className="space-y-3">
        {impossiveis.map((cb) => (
          <div key={cb.bonus.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="ds-body text-muted-foreground line-through">
                {cb.bonus.displayName}
              </span>
              <span className="ds-mono text-muted-foreground line-through">
                {formatBRL(cb.bonus.valueIfAllAchieved)}
              </span>
            </div>
            {cb.motivoImpossivel && (
              <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
                Motivo: {cb.motivoImpossivel}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
