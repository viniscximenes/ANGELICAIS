"use client";

import { forwardRef } from "react";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";

import {
  PNG_SECTION_TITLE_STYLE,
  PNG_TD_STYLE,
  PNG_TH_STYLE,
  PNG_THEME,
} from "../export-popup-png-theme";

interface OperadorDetalhePngContentProps {
  operador: OperadorIndividual;
  /** Sempre o nome real (login/email antes do @) — nunca nome fantasia. */
  nomeReal: string;
  dataHeader: string;
  meta?: number;
  quartil?: QuartilOperador | null;
}

function formatTx(tx: number | null): string {
  return tx !== null ? `${(tx * 100).toFixed(1)}%` : "—";
}

/**
 * Conteúdo do popup do operador (Consolidado) renderizado em tema CLARO
 * fixo — vive só no wrapper offscreen usado pela captura de PNG
 * (ExportPopupPngButton). Espelha `OperadorDetalheDialog`, mas sem CSS vars.
 */
export const OperadorDetalhePngContent = forwardRef<
  HTMLDivElement,
  OperadorDetalhePngContentProps
>(function OperadorDetalhePngContent(
  { operador, nomeReal, dataHeader, meta = 65, quartil = null },
  ref,
) {
  const resumo = [
    { label: "TX Retenção", valor: formatTx(operador.tx) },
    { label: "Clientes Retidos", valor: operador.retidos.toLocaleString("pt-BR") },
    { label: "Clientes Cancelados", valor: operador.cancelados.toLocaleString("pt-BR") },
    { label: "Total Pedidos", valor: operador.total.toLocaleString("pt-BR") },
  ];

  const chartData = operador.porHora.map((d) => ({
    ...d,
    txDisplay: d.tx !== null ? parseFloat((d.tx * 100).toFixed(1)) : null,
  }));

  const validTxValues = chartData
    .map((d) => d.txDisplay)
    .filter((v): v is number => v !== null);
  const dataMax = validTxValues.length > 0 ? Math.max(...validTxValues) : 100;
  const dataMin = validTxValues.length > 0 ? Math.min(...validTxValues) : 0;

  let gradientOffset = 0;
  if (dataMax <= meta) {
    gradientOffset = 0;
  } else if (dataMin >= meta) {
    gradientOffset = 1;
  } else {
    gradientOffset = (dataMax - meta) / (dataMax - dataMin);
  }

  const metaFracao = meta / 100;
  const abaixoGeral = operador.tx === null || operador.tx < metaFracao;

  return (
    <div
      ref={ref}
      style={{
        width: "680px",
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

      {/* Quartil */}
      {quartil && (quartil.equipe.quartil || quartil.empresa.quartil) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "16px",
            fontSize: "12px",
            color: PNG_THEME.textMuted,
          }}
        >
          {quartil.equipe.quartil && (
            <span>
              Equipe: <strong style={{ color: PNG_THEME.text }}>{quartil.equipe.quartil}</strong>{" "}
              · {quartil.equipe.rank}/{quartil.equipe.totalOperadores}
            </span>
          )}
          {quartil.empresa.quartil && (
            <span>
              Empresa: <strong style={{ color: PNG_THEME.text }}>{quartil.empresa.quartil}</strong>{" "}
              · {quartil.empresa.rank}/{quartil.empresa.totalOperadores}
            </span>
          )}
        </div>
      )}

      {/* Cards resumo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {resumo.map((c, idx) => (
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
            <p
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color:
                  idx === 0
                    ? abaixoGeral
                      ? PNG_THEME.danger
                      : PNG_THEME.success
                    : PNG_THEME.text,
              }}
            >
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Evolução por hora */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={PNG_SECTION_TITLE_STYLE}>Evolução por Hora</h4>
        <div
          style={{
            width: "100%",
            height: "220px",
            border: `1px solid ${PNG_THEME.border}`,
            borderRadius: "6px",
            padding: "12px 8px 4px 8px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="txLineGradPng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={PNG_THEME.success} />
                  <stop offset={gradientOffset} stopColor={PNG_THEME.success} />
                  <stop offset={gradientOffset} stopColor={PNG_THEME.danger} />
                  <stop offset={1} stopColor={PNG_THEME.danger} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: PNG_THEME.textMuted, fontSize: 10, fontFamily: PNG_THEME.fontMono }}
              />
              <YAxis yAxisId="left" domain={[0, 100]} hide />
              <YAxis yAxisId="right" hide />

              <Bar yAxisId="right" dataKey="total" barSize={20} radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isBelow = entry.txDisplay !== null && entry.txDisplay < meta;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isBelow ? PNG_THEME.danger : PNG_THEME.success}
                      opacity={0.15}
                    />
                  );
                })}
              </Bar>

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="txDisplay"
                stroke="url(#txLineGradPng)"
                strokeWidth={2.5}
                dot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                  const isBelow = payload.txDisplay < meta;
                  return (
                    <circle
                      key={`dot-${payload.label}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      stroke={PNG_THEME.bg}
                      strokeWidth={1.5}
                      fill={isBelow ? PNG_THEME.danger : PNG_THEME.success}
                    />
                  );
                }}
                connectNulls
              >
                <LabelList
                  dataKey="txDisplay"
                  position="top"
                  offset={10}
                  formatter={(v) => (typeof v === "number" ? `${v}%` : "")}
                  style={{
                    fontSize: 10,
                    fill: PNG_THEME.text,
                    fontFamily: PNG_THEME.fontMono,
                    fontWeight: 600,
                  }}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retenção por tema */}
      <div>
        <h4 style={PNG_SECTION_TITLE_STYLE}>Retenção por Tema</h4>
        {operador.porMotivo.length === 0 ? (
          <p
            style={{
              fontSize: "12px",
              color: PNG_THEME.textMuted,
              textAlign: "center",
              padding: "24px 0",
              margin: 0,
            }}
          >
            Nenhum atendimento registrado para este operador no dia.
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
                  <th style={PNG_TH_STYLE}>Motivo</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Retidos</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Cancelados</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Pedidos</th>
                  <th style={{ ...PNG_TH_STYLE, textAlign: "center" }}>Taxa</th>
                </tr>
              </thead>
              <tbody>
                {operador.porMotivo.map((m, idx) => (
                  <tr
                    key={m.motivo}
                    style={{ background: idx % 2 === 0 ? PNG_THEME.rowEven : PNG_THEME.rowOdd }}
                  >
                    <td style={PNG_TD_STYLE}>{m.motivo}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>{m.retidos}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>{m.cancelados}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center" }}>{m.total}</td>
                    <td style={{ ...PNG_TD_STYLE, textAlign: "center", fontWeight: 600 }}>
                      {formatTx(m.tx)}
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
