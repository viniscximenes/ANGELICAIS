"use client";

import { motion } from "framer-motion";

import type { OperadorConsolidado } from "@/lib/google/d1";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const META_TX = 0.66; // 66%

interface KpiCardsProps {
  operador: OperadorConsolidado | null;
}

export function KpiCards({ operador }: KpiCardsProps) {
  const tx = operador?.txRetencao;
  const txDisplay =
    tx === null || tx === undefined ? "—" : (tx * 100).toFixed(1);

  const txStatus: "success" | "danger" | "neutral" =
    tx === null || tx === undefined
      ? "neutral"
      : tx >= META_TX
        ? "success"
        : "danger";

  const txColor =
    txStatus === "success"
      ? "var(--success)"
      : txStatus === "danger"
        ? "var(--danger)"
        : "var(--muted-foreground)";

  return (
    <div className="space-y-6">
      {/* Card grande de TX de Retenção */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
        className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
      >
        {/* Borda decorativa superior com cor do status */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-[2px] w-full"
          style={{
            background: `linear-gradient(to right, transparent, ${txColor}, transparent)`,
          }}
        />

        <p className="ds-small text-muted-foreground mb-3 tracking-wider">
          TAXA DE RETENÇÃO
        </p>

        <div
          className="flex items-baseline justify-center gap-2"
          style={{
            filter:
              txStatus !== "neutral"
                ? `drop-shadow(0 0 24px ${txColor}40)`
                : undefined,
          }}
        >
          <span
            className="ds-display transition-colors duration-500"
            style={{ color: txColor }}
          >
            {txDisplay}
          </span>
          {txDisplay !== "—" && (
            <span
              className="ds-h2 transition-colors duration-500"
              style={{ color: txColor, opacity: 0.6 }}
            >
              %
            </span>
          )}
        </div>

        {txDisplay !== "—" && (
          <p className="ds-mono-sm text-muted-foreground mt-2">
            meta: {(META_TX * 100).toFixed(0)}%
          </p>
        )}
      </motion.div>

      {/* 3 cards menores */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <KpiCard
          label="RETIDOS"
          value={operador?.retidos ?? 0}
          accent="success"
          delay={0.3}
        />
        <KpiCard
          label="CANCELADOS"
          value={operador?.cancelados ?? 0}
          accent="danger"
          delay={0.38}
        />
        <KpiCard
          label="PEDIDOS"
          value={operador?.pedidos ?? 0}
          accent="primary"
          delay={0.46}
        />
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  accent: "success" | "danger" | "primary";
  delay: number;
}

function KpiCard({ label, value, accent, delay }: KpiCardProps) {
  const accentColor =
    accent === "success"
      ? "var(--success)"
      : accent === "danger"
        ? "var(--danger)"
        : "var(--primary)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 relative overflow-hidden rounded-lg p-6"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{ background: accentColor }}
      />
      <p className="ds-small text-muted-foreground mb-2 tracking-wider">
        {label}
      </p>
      <p className="ds-display" style={{ fontSize: "2.25rem" }}>
        {value}
      </p>
    </motion.div>
  );
}
