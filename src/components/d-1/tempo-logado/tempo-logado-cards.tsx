"use client";

import { motion } from "framer-motion";

import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
} from "@/lib/google/d1/tempo-logado";
import { timeToSeconds } from "@/lib/google/d1/tempo-logado/parse";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Metas em segundos
const META_TEMPO_LOGADO = 6 * 3600 + 20 * 60; // 06:20:00
const LIMITE_LOGIN_OK = 14 * 3600 + 5 * 60; // 14:05:00
const LIMITE_LOGIN_ATENCAO = 14 * 3600 + 10 * 60; // 14:10:00

interface TempoLogadoCardsProps {
  tempoLogado: OperadorTempoLogado | null;
  loginLogout: OperadorLoginLogout | null;
}

/**
 * 3 zonas (sem amarelo): cinza se 0, vermelho < 06:20, verde >= 06:20.
 */
function getTempoLogadoColor(tempo: string): string {
  if (tempo === "00:00:00") return "var(--muted-foreground)";
  const sec = timeToSeconds(tempo);
  if (sec >= META_TEMPO_LOGADO) return "var(--success)";
  return "var(--danger)";
}

function getLoginColor(login: string | null): string {
  if (!login) return "var(--muted-foreground)";
  const sec = timeToSeconds(login);
  if (sec <= LIMITE_LOGIN_OK) return "var(--success)";
  if (sec <= LIMITE_LOGIN_ATENCAO) return "var(--warning)";
  return "var(--danger)";
}

export function TempoLogadoCards({
  tempoLogado,
  loginLogout,
}: TempoLogadoCardsProps) {
  const semLogin = !tempoLogado || tempoLogado.tempoLogado === "00:00:00";

  const displayTempoLogado = tempoLogado?.tempoLogado ?? "00:00:00";
  const displayRestante = tempoLogado?.tempoRestante ?? "06:20:00";
  // Quando operador não logou, logout estimado da planilha não faz sentido
  // (vira "06:20:00" pela fórmula 0 + tempoRestante)
  const displayLogoutEstimado = semLogin
    ? "—"
    : (tempoLogado?.logoutEstimado ?? "—");

  const displayLogin = loginLogout?.horaLogin ?? "—";

  const tempoLogadoColor = getTempoLogadoColor(displayTempoLogado);
  const tempoLogadoIsZero = displayTempoLogado === "00:00:00";
  const restanteIsZero = displayRestante === "00:00:00";

  return (
    <div className="space-y-6">
      {/* Card grande de Logout Estimado */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
        className="elevation-2 relative overflow-hidden rounded-xl p-6 text-center lg:p-8"
      >
        {/* Linha superior cinza fixa (igual ao hero do consolidado) */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-[2px] w-full"
          style={{
            background: `linear-gradient(to right, transparent, var(--border), transparent)`,
          }}
        />
        <p className="ds-small text-muted-foreground mb-3 tracking-wider">
          LOGOUT ESTIMADO
        </p>
        <div className="flex items-baseline justify-center">
          <span
            className="ds-display"
            style={{
              color: semLogin
                ? "var(--muted-foreground)"
                : "var(--foreground)",
            }}
          >
            {displayLogoutEstimado}
          </span>
        </div>
        <p className="ds-mono-sm text-muted-foreground mt-2">
          {semLogin
            ? "você ainda não fez login hoje"
            : "horário em que você pode deslogar"}
        </p>
      </motion.div>

      {/* 3 cards menores */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Tempo logado */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          {/* Linha superior cinza fixa (igual ao hero do consolidado) */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-[2px] w-full"
            style={{
              background: `linear-gradient(to right, transparent, var(--border), transparent)`,
            }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            TEMPO LOGADO
          </p>
          <p
            className="ds-display"
            style={{
              fontSize: "2.25rem",
              color: tempoLogadoIsZero ? "var(--muted-foreground)" : tempoLogadoColor,
            }}
          >
            {displayTempoLogado}
          </p>
        </motion.div>

        {/* Tempo restante */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19, duration: 0.25, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{
              background: restanteIsZero
                ? "var(--success)"
                : "var(--muted-foreground)",
            }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            TEMPO RESTANTE
          </p>
          <p className="ds-display" style={{ fontSize: "2.25rem" }}>
            {displayRestante}
          </p>
          {restanteIsZero && !semLogin && (
            <p className="ds-mono-sm mt-2" style={{ color: "var(--success)" }}>
              meta atingida ✓
            </p>
          )}
        </motion.div>

        {/* Horário de login */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.25, ease: EASE_OUT_EXPO }}
          className="elevation-1 relative overflow-hidden rounded-lg p-6"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ background: getLoginColor(loginLogout?.horaLogin ?? null) }}
          />
          <p className="ds-small text-muted-foreground mb-2 tracking-wider">
            HORÁRIO DE LOGIN
          </p>
          <p className="ds-display" style={{ fontSize: "2.25rem" }}>
            {displayLogin}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
