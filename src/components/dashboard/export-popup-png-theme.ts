import type { CSSProperties } from "react";

const TIMEZONE = "America/Sao_Paulo";

/**
 * Paleta clara fixa usada em TODO conteúdo capturado como PNG (popups de
 * operador) — independe do tema do site (claro/escuro). Mesmo padrão de
 * cores dos exports "excel" já existentes (EquipeTable, EvolucaoGrafico).
 */
export const PNG_THEME = {
  bg: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
  border: "#e5e5e5",
  headerBg: "#1e3a5f",
  headerText: "#ffffff",
  rowEven: "#ffffff",
  rowOdd: "#f8f8f8",
  cardBg: "#f5f5f5",
  cardBorder: "#e5e5e5",
  success: "#2e7d32",
  danger: "#c62828",
  fontFamily: "'Segoe UI', 'Arial', sans-serif",
  fontMono: "'Consolas', 'Courier New', monospace",
} as const;

export const PNG_SECTION_TITLE_STYLE: CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: PNG_THEME.textMuted,
};

export const PNG_TH_STYLE: CSSProperties = {
  padding: "8px 10px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: PNG_THEME.headerText,
  textAlign: "left",
  whiteSpace: "nowrap",
};

export const PNG_TD_STYLE: CSSProperties = {
  padding: "7px 10px",
  color: PNG_THEME.text,
  fontVariantNumeric: "tabular-nums",
};

/** Data de hoje (Brasília) pronta pro header do PNG ("09/08/26") e pro nome do arquivo ("09-08-26"). */
export function getDataPngHoje(): { header: string; file: string } {
  const header = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  return { header, file: header.replace(/\//g, "-") };
}
