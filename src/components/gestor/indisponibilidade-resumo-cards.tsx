"use client";

import { motion } from "framer-motion";

import {
  META_INDISPONIBILIDADE,
  type IndispResumo,
} from "@/lib/google/gestor/indisponibilidade-types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function fmtPct(n: number): string {
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

interface IndisponibilidadeResumoCardsProps {
  resumo: IndispResumo;
}

export function IndisponibilidadeResumoCards({
  resumo,
}: IndisponibilidadeResumoCardsProps) {
  const media = resumo.indispMediaEquipe;
  const mediaCumpriu = media !== null && media < META_INDISPONIBILIDADE;
  const mediaColor =
    media === null
      ? "var(--muted-foreground)"
      : mediaCumpriu
        ? "var(--success)"
        : "var(--danger)";

  return (
    <div className="space-y-6">
      {/* Card grande: indisponibilidade média da equipe */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.3, ease: EASE_OUT_EXPO }}
        className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-[2px] w-full"
          style={{
            background: `linear-gradient(to right, transparent, ${mediaColor}, transparent)`,
          }}
        />
        <p className="ds-small text-muted-foreground mb-3 tracking-wider">
          INDISPONIBILIDADE MÉDIA DA EQUIPE
        </p>
        <div
          className="flex items-baseline justify-center gap-2"
          style={{
            filter:
              media !== null
                ? `drop-shadow(0 0 24px ${mediaColor}40)`
                : undefined,
          }}
        >
          <span
            className="ds-display transition-colors duration-500"
            style={{
              color: mediaColor,
              fontSize: "2.5rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {media !== null ? fmtPct(media) : "—"}
          </span>
        </div>
        <p className="ds-mono-sm text-muted-foreground mt-2">
          meta: abaixo de {META_INDISPONIBILIDADE}% · {resumo.total} operadores
        </p>
      </motion.div>

      {/* 3 cards menores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <ResumoCard
          label="DENTRO DA META"
          value={resumo.dentroDaMeta}
          accentColor="var(--success)"
          delay={0.15}
        />
        <ResumoCard
          label="ACIMA DA META"
          value={resumo.acimaDaMeta}
          accentColor="var(--danger)"
          delay={0.22}
        />
        <ResumoCard
          label="AUSENTES"
          value={resumo.ausentes}
          accentColor="var(--muted-foreground)"
          delay={0.29}
        />
      </div>
    </div>
  );
}

interface ResumoCardProps {
  label: string;
  value: number;
  accentColor: string;
  delay: number;
}

function ResumoCard({ label, value, accentColor, delay }: ResumoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 relative overflow-hidden rounded-lg p-5"
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
