"use client";

import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
} from "@/lib/google/d1/tempo-logado";
import { timeToSeconds } from "@/lib/google/d1/tempo-logado/parse";

const META_TEMPO_LOGADO = 6 * 3600 + 20 * 60; // 06:20:00
const LIMITE_LOGIN_OK = 14 * 3600 + 5 * 60; // 14:05:00
const LIMITE_LOGIN_ATENCAO = 14 * 3600 + 10 * 60; // 14:10:00

interface TempoLogadoEquipeTableProps {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
  variant?: "screen" | "excel";
}

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

export function TempoLogadoEquipeTable({
  operadores,
  loginLogout,
  variant = "screen",
}: TempoLogadoEquipeTableProps) {
  if (variant === "excel") {
    return (
      <ExcelTable operadores={operadores} loginLogout={loginLogout} />
    );
  }
  return <ScreenTable operadores={operadores} loginLogout={loginLogout} />;
}

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const COL_DIVIDER_SCREEN: React.CSSProperties = {
  borderRight: "1px solid var(--row-border)",
};

function getLoginColorScreen(login: string | null): string {
  if (!login) return "var(--muted-foreground)";
  const sec = timeToSeconds(login);
  if (sec <= LIMITE_LOGIN_OK) return "var(--success)";
  if (sec <= LIMITE_LOGIN_ATENCAO) return "var(--warning)";
  return "var(--danger)";
}

function ScreenTable({
  operadores,
  loginLogout,
}: {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
}) {
  const loginLogoutMap = new Map(loginLogout.map((l) => [l.email, l]));
  const logadosCount = operadores.filter(
    (o) => o.tempoLogado !== "00:00:00",
  ).length;

  return (
    <div
      data-tempo-logado-equipe-table
      className="elevation-1 overflow-hidden rounded-xl"
    >
      <div
        className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-0 border-b px-0 py-2 font-semibold tracking-wider uppercase"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-3 px-3" style={COL_DIVIDER_SCREEN}>
          Operador
        </div>
        <div
          className="col-span-3 px-3 text-right"
          style={COL_DIVIDER_SCREEN}
        >
          Login
        </div>
        <div
          className="col-span-3 px-3 text-right"
          style={COL_DIVIDER_SCREEN}
        >
          Restante
        </div>
        <div className="col-span-3 px-3 text-right">Tempo logado</div>
      </div>

      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const ll = loginLogoutMap.get(op.email);
        const semLogin = op.tempoLogado === "00:00:00";
        const tempoSec = semLogin ? 0 : timeToSeconds(op.tempoLogado);
        const meetsM = !semLogin && tempoSec >= META_TEMPO_LOGADO;
        const belowMeta = !semLogin && !meetsM;
        const restanteIsZero = op.tempoRestante === "00:00:00";
        const loginColor = getLoginColorScreen(ll?.horaLogin ?? null);

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
                ...COL_DIVIDER_SCREEN,
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
              className="ds-mono-sm col-span-3 px-3 text-right"
              style={{
                ...COL_DIVIDER_SCREEN,
                color: loginColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {ll?.horaLogin ?? "—"}
            </div>
            <div
              className="ds-mono-sm col-span-3 px-3 text-right"
              style={{
                ...COL_DIVIDER_SCREEN,
                color: restanteIsZero
                  ? "var(--muted-foreground)"
                  : "var(--foreground)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {op.tempoRestante}
            </div>
            <div className="ds-mono-sm col-span-3 flex items-center justify-end gap-1.5 px-3">
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

      <div
        className="ds-body grid grid-cols-12 items-center gap-0 px-0 py-2"
        style={{
          borderTop: "1px solid var(--border)",
          fontWeight: 500,
        }}
      >
        <div className="col-span-3 px-3" style={COL_DIVIDER_SCREEN}>
          EQUIPE
        </div>
        <div
          className="text-muted-foreground col-span-3 px-3 text-right"
          style={COL_DIVIDER_SCREEN}
        >
          —
        </div>
        <div
          className="text-muted-foreground col-span-3 px-3 text-right"
          style={COL_DIVIDER_SCREEN}
        >
          —
        </div>
        <div className="col-span-3 px-3 text-right">
          <span className="ds-mono-sm text-muted-foreground">
            {logadosCount} de {operadores.length} logados
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
   ──────────────────────────────────────────────────────────────────── */

const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";
const MONO_STACK = "'Consolas', 'Courier New', monospace";

const EXCEL_COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #d0d0d0",
};

const EXCEL_HEADER_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #4a7ba6",
};

const EXCEL_HEADER_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const EXCEL_TEXT_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "left",
};

const EXCEL_NUM_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: MONO_STACK,
  fontSize: "12px",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

function getLoginColorExcel(login: string | null): string {
  if (!login) return "#4a5560";
  const sec = timeToSeconds(login);
  if (sec <= LIMITE_LOGIN_OK) return "#2e7d32";
  if (sec <= LIMITE_LOGIN_ATENCAO) return "#ed6c02";
  return "#c62828";
}

function ExcelTable({
  operadores,
  loginLogout,
}: {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
}) {
  const loginLogoutMap = new Map(loginLogout.map((l) => [l.email, l]));
  const logadosCount = operadores.filter(
    (o) => o.tempoLogado !== "00:00:00",
  ).length;

  return (
    <div
      data-tempo-logado-equipe-table
      style={{
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #c0c0c0",
        boxShadow: "none",
        fontFamily: SANS_STACK,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 3fr 3fr 3fr",
          background: "#1f4e78",
          borderBottom: "1px solid #1f4e78",
        }}
      >
        <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
          Operador
        </div>
        <div
          style={{
            ...EXCEL_HEADER_CELL,
            ...EXCEL_HEADER_DIVIDER,
            textAlign: "right",
          }}
        >
          Login
        </div>
        <div
          style={{
            ...EXCEL_HEADER_CELL,
            ...EXCEL_HEADER_DIVIDER,
            textAlign: "right",
          }}
        >
          Restante
        </div>
        <div style={{ ...EXCEL_HEADER_CELL, textAlign: "right" }}>
          Tempo logado
        </div>
      </div>

      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const ll = loginLogoutMap.get(op.email);
        const semLogin = op.tempoLogado === "00:00:00";
        const tempoSec = semLogin ? 0 : timeToSeconds(op.tempoLogado);
        const meetsM = !semLogin && tempoSec >= META_TEMPO_LOGADO;
        const belowMeta = !semLogin && !meetsM;
        const loginColor = getLoginColorExcel(ll?.horaLogin ?? null);

        const rowBg = belowMeta ? "#fff5f5" : "#ffffff";
        const tempoColor = semLogin
          ? "#000000"
          : belowMeta
            ? "#c62828"
            : "#2e7d32";

        return (
          <div
            key={op.email}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 3fr 3fr 3fr",
              background: rowBg,
              borderBottom: isLast ? "none" : "1px solid #d0d0d0",
            }}
          >
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: "#000000",
                fontWeight: belowMeta ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {formatOperatorLabel(op.email)}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                ...EXCEL_COL_DIVIDER,
                color: loginColor,
              }}
            >
              {ll?.horaLogin ?? "—"}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                ...EXCEL_COL_DIVIDER,
                color: "#000000",
              }}
            >
              {op.tempoRestante}
            </div>
            <div
              style={{
                ...EXCEL_NUM_CELL,
                color: tempoColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "6px",
                fontWeight: semLogin ? 400 : 500,
              }}
            >
              {semLogin ? (
                <span>—</span>
              ) : (
                <>
                  <span>{op.tempoLogado}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: tempoColor,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 3fr 3fr 3fr",
          background: "#f0f0f0",
          borderTop: "2px solid #808080",
          fontWeight: 600,
          color: "#000000",
        }}
      >
        <div
          style={{
            ...EXCEL_TEXT_CELL,
            ...EXCEL_COL_DIVIDER,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          EQUIPE
        </div>
        <div
          style={{
            ...EXCEL_NUM_CELL,
            ...EXCEL_COL_DIVIDER,
            color: "#000000",
          }}
        >
          —
        </div>
        <div
          style={{
            ...EXCEL_NUM_CELL,
            ...EXCEL_COL_DIVIDER,
            color: "#000000",
          }}
        >
          —
        </div>
        <div
          style={{
            ...EXCEL_NUM_CELL,
            color: "#000000",
            fontWeight: 600,
          }}
        >
          {logadosCount} de {operadores.length} logados
        </div>
      </div>
    </div>
  );
}
