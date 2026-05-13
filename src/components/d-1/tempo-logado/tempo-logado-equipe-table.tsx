"use client";

import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
} from "@/lib/google/d1/tempo-logado";
import { timeToSeconds } from "@/lib/google/d1/tempo-logado/parse";

const META_TEMPO_LOGADO = 6 * 3600 + 20 * 60; // 06:20:00

interface TempoLogadoEquipeTableProps {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
}

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function formatLogoutDisplay(value: string | null): string {
  if (!value) return "—";
  if (value === "00:00:00") return "ainda logado";
  return value;
}

function formatLoginDisplay(value: string | null): string {
  return value ?? "—";
}

function getTempoLogadoStatus(tempo: string): "above" | "below" | "neutral" {
  if (tempo === "00:00:00") return "neutral";
  const sec = timeToSeconds(tempo);
  if (sec >= META_TEMPO_LOGADO) return "above";
  return "below";
}

function getTempoLogadoColor(
  status: "above" | "below" | "neutral",
): string {
  if (status === "above") return "var(--success)";
  if (status === "below") return "var(--danger)";
  return "var(--muted-foreground)";
}

function getRowBackground(
  status: "above" | "below" | "neutral",
): string {
  if (status === "above") {
    return "linear-gradient(to left, color-mix(in oklch, var(--success) 18%, transparent) 0%, color-mix(in oklch, var(--success) 12%, transparent) 40%, transparent 85%)";
  }
  if (status === "below") {
    return "linear-gradient(to left, color-mix(in oklch, var(--danger) 18%, transparent) 0%, color-mix(in oklch, var(--danger) 12%, transparent) 40%, transparent 85%)";
  }
  return "transparent";
}

export function TempoLogadoEquipeTable({
  operadores,
  loginLogout,
}: TempoLogadoEquipeTableProps) {
  const loginLogoutMap = new Map(loginLogout.map((l) => [l.email, l]));

  return (
    <div
      className="elevation-1 rounded-xl p-3"
      data-tempo-logado-equipe-table
    >
      {/* Cabeçalho */}
      <div
        className="grid grid-cols-[2fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr] gap-0 overflow-hidden rounded-md"
        style={{ background: "var(--elevation-2-bg)" }}
      >
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Operador
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Login
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Logout
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Restante
        </span>
        <span
          className="ds-mono-sm border-r border-[var(--border)] px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Logout est.
        </span>
        <span
          className="ds-mono-sm px-1.5 py-1.5 text-right font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Tempo logado
        </span>
      </div>

      {/* Linhas dos operadores */}
      {operadores.map((op) => {
        const status = getTempoLogadoStatus(op.tempoLogado);
        const rowBg = getRowBackground(status);
        const tempoColor = getTempoLogadoColor(status);
        const dotColor =
          status === "above"
            ? "var(--success)"
            : status === "below"
              ? "var(--danger)"
              : null;

        const ll = loginLogoutMap.get(op.email);
        const restanteIsZero = op.tempoRestante === "00:00:00";
        const semLogin = op.tempoLogado === "00:00:00";

        return (
          <div
            key={op.email}
            className="grid grid-cols-[2fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr] gap-0 py-1"
            style={{ background: rowBg }}
          >
            <span className="ds-mono-sm text-muted-foreground flex items-center border-r border-[var(--border)] px-1.5">
              {formatOperatorLabel(op.email)}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color: ll?.horaLogin
                  ? "color-mix(in oklch, var(--foreground) 75%, transparent)"
                  : "var(--muted-foreground)",
              }}
            >
              {formatLoginDisplay(ll?.horaLogin ?? null)}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color: !ll?.horaLogout
                  ? "var(--muted-foreground)"
                  : ll.horaLogout === "00:00:00"
                    ? "var(--success)"
                    : "color-mix(in oklch, var(--foreground) 75%, transparent)",
                fontSize: ll?.horaLogout === "00:00:00" ? "0.75rem" : undefined,
              }}
            >
              {formatLogoutDisplay(ll?.horaLogout ?? null)}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color: restanteIsZero
                  ? "var(--muted-foreground)"
                  : "color-mix(in oklch, var(--foreground) 75%, transparent)",
              }}
            >
              {op.tempoRestante}
            </span>
            <span
              className="ds-mono flex items-center justify-end border-r border-[var(--border)] px-1.5 text-right"
              style={{
                color: semLogin
                  ? "var(--muted-foreground)"
                  : "color-mix(in oklch, var(--foreground) 75%, transparent)",
              }}
            >
              {semLogin ? "—" : op.logoutEstimado}
            </span>
            <span
              className="ds-mono flex items-center justify-end gap-2 px-1.5 font-medium"
              style={{ color: tempoColor }}
            >
              {op.tempoLogado}
              {dotColor && (
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full"
                  style={{
                    width: "7px",
                    height: "7px",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
