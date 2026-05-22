"use client";

import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
} from "@/lib/google/d1/tempo-logado";
import { timeToSeconds } from "@/lib/google/d1/tempo-logado/parse";

const META_TEMPO_LOGADO = 6 * 3600 + 20 * 60; // 06:20:00
const LIMITE_LOGIN_OK = 14 * 3600 + 5 * 60; // 14:05:00
const LIMITE_LOGIN_ATENCAO = 14 * 3600 + 10 * 60; // 14:10:00

const COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid var(--row-border)",
};

interface TempoLogadoEquipeTableProps {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
}

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function getLoginColor(login: string | null): string {
  if (!login) return "var(--muted-foreground)";
  const sec = timeToSeconds(login);
  if (sec <= LIMITE_LOGIN_OK) return "var(--success)";
  if (sec <= LIMITE_LOGIN_ATENCAO) return "var(--warning)";
  return "var(--danger)";
}

export function TempoLogadoEquipeTable({
  operadores,
  loginLogout,
}: TempoLogadoEquipeTableProps) {
  const loginLogoutMap = new Map(loginLogout.map((l) => [l.email, l]));
  const logadosCount = operadores.filter(
    (o) => o.tempoLogado !== "00:00:00",
  ).length;

  return (
    <div
      data-tempo-logado-equipe-table
      className="elevation-1 overflow-hidden rounded-xl"
    >
      {/* Header */}
      <div
        className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-0 border-b px-0 py-2 font-semibold tracking-wider uppercase"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-3 px-3" style={COL_DIVIDER}>
          Operador
        </div>
        <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
          Login
        </div>
        <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
          Logout
        </div>
        <div className="col-span-1 px-3 text-right" style={COL_DIVIDER}>
          Restante
        </div>
        <div className="col-span-2 px-3 text-right" style={COL_DIVIDER}>
          Logout est.
        </div>
        <div className="col-span-2 px-3 text-right">Tempo logado</div>
      </div>

      {/* Linhas dos operadores */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const ll = loginLogoutMap.get(op.email);
        const semLogin = op.tempoLogado === "00:00:00";
        const tempoSec = semLogin ? 0 : timeToSeconds(op.tempoLogado);
        const meetsM = !semLogin && tempoSec >= META_TEMPO_LOGADO;
        const belowMeta = !semLogin && !meetsM;
        const restanteIsZero = op.tempoRestante === "00:00:00";

        const loginColor = getLoginColor(ll?.horaLogin ?? null);
        const logoutStatus = ll?.logoutStatus ?? "sem_login";
        const logoutLabel =
          logoutStatus === "logado"
            ? "Logado"
            : logoutStatus === "deslogado"
              ? "Deslogado"
              : "—";
        const logoutColor =
          logoutStatus === "logado"
            ? "var(--success)"
            : "var(--muted-foreground)";

        return (
          <div
            key={op.email}
            className="grid grid-cols-12 items-center gap-0 px-0 py-1.5"
            style={{
              background: belowMeta
                ? "color-mix(in oklch, var(--danger) 7%, transparent)"
                : "transparent",
              borderBottom: isLast ? "none" : "1px solid var(--row-border)",
              opacity: semLogin ? 0.35 : 1,
            }}
          >
            <div
              className="ds-body col-span-3 truncate px-3"
              style={{
                ...COL_DIVIDER,
                color: semLogin
                  ? "var(--muted-foreground)"
                  : belowMeta
                    ? "var(--danger)"
                    : "var(--foreground)",
                fontWeight: belowMeta ? 500 : 400,
              }}
            >
              {formatOperatorLabel(op.email)}
            </div>
            <div
              className="ds-mono-sm col-span-2 px-3 text-right"
              style={{
                ...COL_DIVIDER,
                color: loginColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {ll?.horaLogin ?? "—"}
            </div>
            <div
              className="ds-mono-sm col-span-2 px-3 text-right"
              style={{ ...COL_DIVIDER, color: logoutColor }}
            >
              {logoutLabel}
            </div>
            <div
              className="ds-mono-sm col-span-1 px-3 text-right"
              style={{
                ...COL_DIVIDER,
                color: restanteIsZero
                  ? "var(--muted-foreground)"
                  : "var(--foreground)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {op.tempoRestante}
            </div>
            <div
              className="ds-mono-sm col-span-2 px-3 text-right"
              style={{
                ...COL_DIVIDER,
                color: semLogin
                  ? "var(--muted-foreground)"
                  : "var(--foreground)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {semLogin ? "—" : op.logoutEstimado}
            </div>
            <div className="ds-mono-sm col-span-2 flex items-center justify-end gap-1.5 px-3">
              {semLogin ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <span
                    style={{
                      color: belowMeta
                        ? "var(--danger)"
                        : "var(--success)",
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {op.tempoLogado}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: belowMeta
                        ? "var(--danger)"
                        : "var(--success)",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Linha EQUIPE (rodapé) */}
      <div
        className="ds-body grid grid-cols-12 items-center gap-0 px-0 py-2"
        style={{
          borderTop: "1px solid var(--border)",
          fontWeight: 500,
        }}
      >
        <div className="col-span-3 px-3" style={COL_DIVIDER}>
          EQUIPE
        </div>
        <div
          className="text-muted-foreground col-span-2 px-3 text-right"
          style={COL_DIVIDER}
        >
          —
        </div>
        <div
          className="text-muted-foreground col-span-2 px-3 text-right"
          style={COL_DIVIDER}
        >
          —
        </div>
        <div
          className="text-muted-foreground col-span-1 px-3 text-right"
          style={COL_DIVIDER}
        >
          —
        </div>
        <div
          className="text-muted-foreground col-span-2 px-3 text-right"
          style={COL_DIVIDER}
        >
          —
        </div>
        <div className="col-span-2 px-3 text-right">
          <span className="ds-mono-sm text-muted-foreground">
            {logadosCount} de {operadores.length} logados
          </span>
        </div>
      </div>
    </div>
  );
}
