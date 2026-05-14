"use client";

import { motion } from "framer-motion";

import type {
  OperadorIndisp,
  OperadorPausa,
} from "@/lib/google/d1/indisponibilidade";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const META_INDISP = 14.5;

interface IndispCardsProps {
  indisp: OperadorIndisp | null;
  pausa: OperadorPausa | null;
}

type IndispStatus = "success" | "danger" | "neutral";

function getIndispStatus(percent: number | null): IndispStatus {
  if (percent === null) return "neutral";
  if (percent <= META_INDISP) return "success";
  return "danger";
}

function getIndispColor(status: IndispStatus): string {
  if (status === "success") return "var(--success)";
  if (status === "danger") return "var(--danger)";
  return "var(--muted-foreground)";
}

export function IndispCards({ indisp, pausa }: IndispCardsProps) {
  const semDados = !indisp || indisp.indispPercent === null;

  const indispValue = indisp?.indispPercent ?? null;
  const status = getIndispStatus(indispValue);
  const color = getIndispColor(status);

  const tempoIndisp = pausa?.tempoIndisponivel ?? "00:00:00";
  const pausaParticular = pausa?.pausaParticular ?? "00:00:00";
  const nr17 = pausa?.nr17 ?? "00:00:00";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT_EXPO }}
        className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
      >
        {status !== "neutral" && (
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 left-0 h-[2px]"
            style={{
              background: `linear-gradient(to right, transparent 0%, ${color} 50%, transparent 100%)`,
            }}
          />
        )}
        <p className="ds-small text-muted-foreground mb-3 tracking-wider">
          TX INDISPONIBILIDADE
        </p>
        <div className="flex items-baseline justify-center">
          {indispValue === null ? (
            <span
              className="ds-display"
              style={{ color: "var(--muted-foreground)" }}
            >
              —
            </span>
          ) : (
            <>
              <span className="ds-display" style={{ color }}>
                {indispValue.toFixed(1)}
              </span>
              <span
                className="ds-display"
                style={{
                  color: `color-mix(in oklch, ${color} 60%, transparent)`,
                  fontSize: "60%",
                  marginLeft: "0.1em",
                }}
              >
                %
              </span>
            </>
          )}
        </div>
        <p className="ds-mono-sm text-muted-foreground mt-2">
          {semDados ? "você ainda não fez login hoje" : "meta: ≤ 14,5%"}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ background: "var(--muted-foreground)" }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            TEMPO INDISPONÍVEL
          </p>
          <p className="ds-display" style={{ fontSize: "2.25rem" }}>
            {tempoIndisp}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ background: "var(--muted-foreground)" }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            PAUSA PARTICULAR
          </p>
          <p className="ds-display" style={{ fontSize: "2.25rem" }}>
            {pausaParticular}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.5, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ background: "var(--muted-foreground)" }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            NR17 (10 + 20)
          </p>
          <p className="ds-display" style={{ fontSize: "2.25rem" }}>
            {nr17}
          </p>
          <p className="ds-mono-sm text-muted-foreground mt-2">
            mínimo: 00:40:00
          </p>
        </motion.div>
      </div>
    </div>
  );
}
