"use client";

import { motion } from "framer-motion";

import { META_TEMPO_LOGADO_SEGUNDOS, type TempoLogadoResumo } from "@/lib/google/gestor/tempo-logado-types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function formatTempoSegundos(s: number): string {
  if (s <= 0) return "00:00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface TempoLogadoResumoCardsProps {
  resumo: TempoLogadoResumo;
}

export function TempoLogadoResumoCards({ resumo }: TempoLogadoResumoCardsProps) {
  const mediaCumpriu = resumo.tempoMedioSegundos >= META_TEMPO_LOGADO_SEGUNDOS;
  const mediaColor =
    resumo.tempoMedioSegundos === 0
      ? "var(--muted-foreground)"
      : mediaCumpriu
        ? "var(--success)"
        : "var(--danger)";

  return (
    <div className="space-y-6">
      {/* Card grande: tempo médio da equipe */}
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
          TEMPO MÉDIO DA EQUIPE
        </p>
        <div
          className="flex items-baseline justify-center gap-2"
          style={{
            filter:
              resumo.tempoMedioSegundos > 0
                ? `drop-shadow(0 0 24px ${mediaColor}40)`
                : undefined,
          }}
        >
          <span
            className="ds-display transition-colors duration-500"
            style={{ color: mediaColor, fontSize: "2.5rem", fontVariantNumeric: "tabular-nums" }}
          >
            {formatTempoSegundos(resumo.tempoMedioSegundos)}
          </span>
        </div>
        <p className="ds-mono-sm text-muted-foreground mt-2">
          meta: 06:20:00 · {resumo.total} operadores
        </p>
      </motion.div>

      {/* 4 cards menores */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResumoCard
          label="CUMPRIRAM A META"
          value={resumo.cumpriramMeta}
          accentColor="var(--success)"
          delay={0.15}
        />
        <ResumoCard
          label="ABAIXO DA META"
          value={resumo.abaixoDaMeta}
          accentColor="var(--danger)"
          delay={0.22}
        />
        <ResumoCard
          label="AINDA LOGADOS"
          value={resumo.aindaLogados}
          accentColor="var(--primary)"
          delay={0.29}
        />
        <ResumoCard
          label="AUSENTES"
          value={resumo.ausentes}
          accentColor="var(--muted-foreground)"
          delay={0.36}
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
