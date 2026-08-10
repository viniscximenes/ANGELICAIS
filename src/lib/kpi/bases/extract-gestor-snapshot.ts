import type { KpiDefinition } from "../types";
import { normalizeHeader } from "./normalize-header";
import type { ParsedClipboard } from "./types";

/**
 * Mapeamento fixo: nome da coluna na planilha do gestor → slug.
 *
 * Não depende de kpi_definitions.expected_header (que é calibrado para a
 * planilha do OPERADOR). Dois cabeçalhos diferem entre as planilhas:
 *   - tx_retencao_liquida_15d: operador usa "Tx. Retenção Líquida 15d (%)",
 *     gestor usa "Tx. Retenção Liq. 15d (%)" (abreviado).
 *   - indisp_total: operador usa "Indisp Total (%)" (abreviado),
 *     gestor usa "Indisponibilidade (%)".
 *
 * Os valores são normalizados via normalizeHeader antes da comparação,
 * tornando o match robusto a quebras de linha, espaços extras e casing.
 */
const GESTOR_HEADER_MAP: ReadonlyArray<readonly [string, string]> = [
  ["Pedidos", "pedidos"],
  ["Churn", "churn"],
  ["Forecast Churn", "forecast_churn"],
  ["% Variação Ticket", "variacao_ticket"],
  ["Tx. Retenção Bruta (%)", "tx_retencao_bruta"],
  ["Tx. Retenção Liq. 15d (%)", "tx_retencao_liquida_15d"],
  ["Tx. Retenção Liq. 7d (%)", "tx_retencao_liquida_7d"],
  ["Atendidas", "atendidas"],
  ["Transfer (%)", "transfer"],
  ["Short Call (%)", "short_call"],
  ["TMA", "tma"],
  ["Rechamada D+1 (%)", "rechamada_d1"],
  ["Rechamada D+7 (%)", "rechamada_d7"],
  ["Tx. Tabulação (%)", "tabulacao"],
  ["CSAT", "csat"],
  ["Engajamento", "engajamento"],
  ["Tempo Projetado", "tempo_projetado"],
  ["Tempo de Login", "tempo_login"],
  ["Aderência Login (%)", "aderencia_login"],
  ["ABS (%)", "abs"],
  ["NR17 (%)", "nr17"],
  ["Pessoal (%)", "pessoal"],
  ["Outras Pausas (%)", "outras_pausas"],
  ["Indisponibilidade (%)", "indisp_total"],
] as const;

// Pre-normalized for O(1) lookup: normalized_header → slug
const GESTOR_NORMALIZED_MAP = new Map<string, string>(
  GESTOR_HEADER_MAP.map(([header, slug]) => [normalizeHeader(header), slug]),
);

const SUPERVISOR_CANDIDATES = ["supervisor"] as const;

export type GestorSnapshotRow = {
  supervisorName: string;
  values: Map<string, number | null>;
};

export type GestorExtractionResult = {
  supervisors: GestorSnapshotRow[];
  missingKpis: string[];
  warnings: string[];
  detectedHeaders: string[];
  debugInfo: {
    separator: "TAB" | "VIRGULA";
    totalHeaders: number;
    rawFirstLineSample: string;
  };
};

function findIdx(
  normalizedHeaders: string[],
  candidates: readonly string[],
): number {
  for (const candidate of candidates) {
    const i = normalizedHeaders.indexOf(normalizeHeader(candidate));
    if (i !== -1) return i;
  }
  return -1;
}

function parseNumeric(value: string): number | null {
  if (
    !value ||
    value === "—" ||
    value === "-" ||
    value.toLowerCase() === "n/a"
  ) {
    return null;
  }

  const stripped = value.trim().replace(/%/g, "");

  // Time format takes priority: HH:MM:SS
  const timeMatch = stripped.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  // BR number format: comma = decimal separator, dot = thousands separator.
  // Examples: "4.223" = 4223, "63,8" = 63.8, "1.234,56" = 1234.56
  const hasComma = stripped.includes(",");
  const hasDot = stripped.includes(".");

  let normalized: string;

  if (hasComma) {
    // Comma is decimal; dots (if any) are thousands separators.
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    // No comma. Dot is thousands separator if exactly 3 digits follow the last dot;
    // otherwise treat as decimal point (e.g., "63.8").
    const segments = stripped.split(".");
    const lastSegLen = (segments[segments.length - 1] ?? "").length;
    normalized =
      lastSegLen === 3 ? stripped.replace(/\./g, "") : stripped;
  } else {
    normalized = stripped;
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

export function extractGestorSnapshot(
  parsed: ParsedClipboard,
  definitions: KpiDefinition[],
): GestorExtractionResult {
  const result: GestorExtractionResult = {
    supervisors: [],
    missingKpis: [],
    warnings: [],
    detectedHeaders: parsed.headers,
    debugInfo: {
      separator: parsed.separator,
      totalHeaders: parsed.headers.length,
      rawFirstLineSample: parsed.rawFirstLineSample,
    },
  };

  const normalizedHeaders = parsed.headers.map(normalizeHeader);

  const supervisorIdx = findIdx(normalizedHeaders, SUPERVISOR_CANDIDATES);
  if (supervisorIdx === -1) {
    result.warnings.push(
      "Coluna 'Supervisor' não encontrada — impossível identificar gestores",
    );
    return result;
  }

  // Match using the fixed gestor header map (not kpi_definitions.expected_header)
  const kpiColumnMap = new Map<string, number>(); // slug → column index
  const matchedSlugs = new Set<string>();

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const slug = GESTOR_NORMALIZED_MAP.get(normalizedHeaders[i]);
    if (slug) {
      kpiColumnMap.set(slug, i);
      matchedSlugs.add(slug);
    }
  }

  // Report which kpi_definitions slugs are absent from the pasted data
  result.missingKpis = definitions
    .filter((def) => !matchedSlugs.has(def.slug))
    .map((def) => def.displayName);

  for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
    const row = parsed.rows[rowIdx];
    const supervisorName = (row.cells[supervisorIdx] || "").trim();
    if (!supervisorName) {
      result.warnings.push(`Linha ${rowIdx + 2}: supervisor vazio, ignorando`);
      continue;
    }

    const values = new Map<string, number | null>();
    for (const [slug, colIdx] of kpiColumnMap.entries()) {
      values.set(slug, parseNumeric(row.cells[colIdx] || ""));
    }

    result.supervisors.push({ supervisorName, values });
  }

  return result;
}
