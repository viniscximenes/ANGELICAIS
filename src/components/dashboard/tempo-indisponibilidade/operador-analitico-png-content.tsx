"use client";

import { forwardRef } from "react";

import type { AderenciaOperador } from "@/lib/d1-db/calcular-aderencia";

import {
  PNG_SECTION_TITLE_STYLE,
  PNG_TD_STYLE,
  PNG_TH_STYLE,
  PNG_THEME,
} from "../export-popup-png-theme";
import {
  PAUSA_FIELDS,
  fmtPct,
  formatDiferenca,
  formatLogin,
  formatLogout,
} from "./format-operador-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

interface OperadorAnaliticoPngContentProps {
  operador: OperadorAnaliticoTempoIndisp;
  /** Sempre o nome real (email antes do @) — nunca nome fantasia. */
  nomeReal: string;
  dataHeader: string;
  aderencia: AderenciaOperador;
}

/**
 * Conteúdo do popup do operador (Tempo Logado & Indisponibilidade)
 * renderizado em tema CLARO fixo — vive só no wrapper offscreen usado pela
 * captura de PNG (ExportPopupPngButton). Espelha `OperadorAnaliticoDialog`,
 * mas sem CSS vars.
 */
export const OperadorAnaliticoPngContent = forwardRef<
  HTMLDivElement,
  OperadorAnaliticoPngContentProps
>(function OperadorAnaliticoPngContent(
  { operador, nomeReal, dataHeader, aderencia },
  ref,
) {
  const resumo = [
    { label: "Tempo Logado", valor: operador.tempoLogado || "—" },
    { label: "% Indisponibilidade", valor: fmtPct(operador.indisponibilidade) },
    { label: "Hora Login", valor: formatLogin(operador.horaLogin) },
    { label: "Hora Logout", valor: formatLogout(operador.statusTL, operador.horaLogout) },
  ];

  const pausasComDados = PAUSA_FIELDS.filter((f) => {
    const val = operador.pausas[f.key];
    return val && val !== "00:00:00" && val !== "—";
  });

  return (
    <div
      ref={ref}
      style={{
        width: "620px",
        background: PNG_THEME.bg,
        color: PNG_THEME.text,
        fontFamily: PNG_THEME.fontFamily,
        padding: "24px",
      }}
    >
      {/* Header: nome real + data */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderBottom: `1px solid ${PNG_THEME.border}`,
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: PNG_THEME.text }}>
          {nomeReal}
        </h2>
        <span
          style={{
            fontSize: "13px",
            color: PNG_THEME.textMuted,
            fontFamily: PNG_THEME.fontMono,
          }}
        >
          {dataHeader}
        </span>
      </div>

      {/* Cards resumo (2x2) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {resumo.map((c) => (
          <div
            key={c.label}
            style={{
              background: PNG_THEME.cardBg,
              border: `1px solid ${PNG_THEME.cardBorder}`,
              borderRadius: "6px",
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                margin: "0 0 4px 0",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                color: PNG_THEME.textMuted,
              }}
            >
              {c.label}
            </p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: PNG_THEME.text }}>
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Aderência */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={PNG_SECTION_TITLE_STYLE}>Aderência</h4>
        {aderencia.forecast === null ? (
          <p
            style={{
              fontSize: "12px",
              color: PNG_THEME.textMuted,
              textAlign: "center",
              padding: "24px 0",
              margin: 0,
            }}
          >
            Horários programados não cadastrados para este operador.
          </p>
        ) : (
          <div
            style={{
              border: `1px solid ${PNG_THEME.border}`,
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: PNG_THEME.headerBg }}>
                  <th style={PNG_TH_STYLE}>Item</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Forecast</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Real</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Diferença</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {aderencia.items.map((item, idx) => (
                  <tr
                    key={item.label}
                    style={{ background: idx % 2 === 0 ? PNG_THEME.rowEven : PNG_THEME.rowOdd }}
                  >
                    <td style={PNG_TD_STYLE}>{item.label}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>
                      {item.horaForecast ?? "—"}
                    </td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>
                      {item.horaReal ?? "—"}
                    </td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>
                      {formatDiferenca(item.diferencaMin)}
                    </td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center", fontWeight: 600 }}>
                      {item.dentroTolerancia === null ? (
                        "—"
                      ) : item.dentroTolerancia ? (
                        <span style={{ color: PNG_THEME.success }}>OK</span>
                      ) : (
                        <span style={{ color: PNG_THEME.danger }}>FORA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pausas detalhadas */}
      <div>
        <h4 style={PNG_SECTION_TITLE_STYLE}>Pausas Detalhadas</h4>
        {pausasComDados.length === 0 ? (
          <p
            style={{
              fontSize: "12px",
              color: PNG_THEME.textMuted,
              textAlign: "center",
              padding: "24px 0",
              margin: 0,
            }}
          >
            Nenhuma pausa registrada para este operador.
          </p>
        ) : (
          <div
            style={{
              border: `1px solid ${PNG_THEME.border}`,
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: PNG_THEME.headerBg }}>
                  <th style={PNG_TH_STYLE}>Pausa</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Duração</th>
                </tr>
              </thead>
              <tbody>
                {pausasComDados.map((f, idx) => (
                  <tr
                    key={f.key}
                    style={{ background: idx % 2 === 0 ? PNG_THEME.rowEven : PNG_THEME.rowOdd }}
                  >
                    <td style={PNG_TD_STYLE}>{f.label}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center", fontWeight: 600 }}>
                      {operador.pausas[f.key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
