"use client";

import { IconX } from "@tabler/icons-react";
import { motion } from "framer-motion";

import type { RvCalculation } from "@/lib/rv/calc-types";
import { formatBRL } from "@/lib/rv/format-money";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  calculation: RvCalculation;
}

export function RvDeflatorsBlock({ calculation }: Props) {
  const aplicados = calculation.deflatorResults.filter((d) => d.ocorrencias > 0);
  const naoAplicados = calculation.deflatorResults.filter(
    (d) => d.ocorrencias === 0,
  );

  const valorDescontado = calculation.subtotal - calculation.liquido;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.43, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="elevation-1 space-y-3 rounded-xl p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconX
            size={18}
            style={{ color: "var(--danger)" }}
            aria-hidden="true"
          />
          <h3 className="ds-h2" style={{ fontSize: "1.1rem" }}>
            Deflatores aplicados
          </h3>
        </div>
        {valorDescontado > 0 ? (
          <span className="ds-mono" style={{ color: "var(--danger)" }}>
            -{formatBRL(valorDescontado)}
          </span>
        ) : (
          <span className="ds-mono text-muted-foreground">—</span>
        )}
      </div>

      {aplicados.length === 0 ? (
        <p className="ds-mono-sm text-muted-foreground italic">
          Nenhum deflator aplicado este mês.
        </p>
      ) : (
        <div className="space-y-2">
          {aplicados.map((d) => (
            <div
              key={d.deflatorType.id}
              className="ds-mono-sm flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">
                {d.deflatorType.displayName}
                {d.ocorrencias > 1 && ` (${d.ocorrencias} ocorrências)`}
                <span className="ml-1 opacity-60">[{d.origem}]</span>
              </span>
              <span style={{ color: "var(--danger)" }}>-{d.percentTotal}%</span>
            </div>
          ))}
        </div>
      )}

      {naoAplicados.length > 0 && (
        <details className="pt-2">
          <summary className="ds-mono-sm text-muted-foreground hover:text-foreground cursor-pointer">
            Outros deflatores não aplicados ({naoAplicados.length})
          </summary>
          <div className="mt-2 ml-3 space-y-1">
            {naoAplicados.map((d) => (
              <div
                key={d.deflatorType.id}
                className="ds-mono-sm text-muted-foreground"
              >
                ✓ {d.deflatorType.displayName} — não se aplica
              </div>
            ))}
          </div>
        </details>
      )}

      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="ds-mono-sm flex items-center justify-between">
          <span className="text-muted-foreground">Total descontado</span>
          <span style={{ color: "var(--danger)" }}>
            -{calculation.somaDescontosPct}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
