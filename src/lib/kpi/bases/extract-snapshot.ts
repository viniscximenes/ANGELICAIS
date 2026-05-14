import type { KpiDefinition } from "../types";
import { normalizeHeader } from "./normalize-header";
import { METADATA_HEADERS, METADATA_SLUGS } from "./types";
import type { ExtractionResult, ParsedClipboard } from "./types";

function findColumnIndex(
  normalizedHeaders: string[],
  candidates: readonly string[],
): number {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const idx = normalizedHeaders.indexOf(normalizedCandidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Converte string em número.
 * Aceita: "62.5", "62,5", "62.5%", "62,5%", "-3", "0", "HH:MM:SS" → segundos.
 * Retorna null para vazio, "—", ou inválido.
 */
function parseNumeric(value: string): number | null {
  if (
    !value ||
    value === "—" ||
    value === "-" ||
    value.toLowerCase() === "n/a"
  ) {
    return null;
  }

  const cleaned = value.trim().replace(/%/g, "").replace(",", ".");

  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num;
}

export function extractSnapshot(
  parsed: ParsedClipboard,
  definitions: KpiDefinition[],
): ExtractionResult {
  const result: ExtractionResult = {
    operators: [],
    missingKpis: [],
    missingMetadata: [],
    warnings: [],
  };

  const normalizedHeaders = parsed.headers.map(normalizeHeader);

  const colaboradorIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.colaborador,
  );
  if (colaboradorIdx === -1) {
    result.warnings.push(
      "Coluna 'Colaborador' não encontrada — impossível identificar operadores",
    );
    return result;
  }

  const kpiColumnMap = new Map<string, number>();
  for (const def of definitions) {
    const normalized = normalizeHeader(def.expectedHeader);
    const idx = normalizedHeaders.indexOf(normalized);
    if (idx === -1) {
      result.missingKpis.push(def);
    } else {
      kpiColumnMap.set(def.slug, idx);
    }
  }

  const metadataColumnMap = new Map<string, number>();

  const gestorIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.gestor,
  );
  if (gestorIdx !== -1) metadataColumnMap.set(METADATA_SLUGS.gestor, gestorIdx);
  else result.missingMetadata.push("Gestor");

  const statusIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.status,
  );
  if (statusIdx !== -1) metadataColumnMap.set(METADATA_SLUGS.status, statusIdx);
  else result.missingMetadata.push("Status");

  const monitoriaIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.monitoria,
  );
  if (monitoriaIdx !== -1)
    metadataColumnMap.set(METADATA_SLUGS.monitoria, monitoriaIdx);
  else result.missingMetadata.push("Monitorias");

  const feedbacksIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.feedbacks,
  );
  if (feedbacksIdx !== -1)
    metadataColumnMap.set(METADATA_SLUGS.feedbacks, feedbacksIdx);
  else result.missingMetadata.push("Feedbacks");

  const forecastPedIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.forecastPedidos,
  );
  if (forecastPedIdx !== -1)
    metadataColumnMap.set(METADATA_SLUGS.forecastPedidos, forecastPedIdx);
  else result.missingMetadata.push("Forecast Pedidos Mês");

  const forecastChurnIdx = findColumnIndex(
    normalizedHeaders,
    METADATA_HEADERS.forecastChurn,
  );
  if (forecastChurnIdx !== -1)
    metadataColumnMap.set(METADATA_SLUGS.forecastChurn, forecastChurnIdx);
  else result.missingMetadata.push("Forecast Churn Mês");

  const textSlugs = new Set<string>([
    METADATA_SLUGS.gestor,
    METADATA_SLUGS.status,
  ]);

  for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
    const row = parsed.rows[rowIdx];

    const operatorEmail = (row.cells[colaboradorIdx] || "").trim().toLowerCase();
    if (!operatorEmail) {
      result.warnings.push(
        `Linha ${rowIdx + 2}: email do operador vazio, ignorando`,
      );
      continue;
    }

    const values = new Map<string, number | string | null>();

    for (const def of definitions) {
      const colIdx = kpiColumnMap.get(def.slug);
      if (colIdx === undefined) continue;

      const raw = row.cells[colIdx] || "";
      const numeric = parseNumeric(raw);
      values.set(def.slug, numeric);
    }

    for (const [slug, colIdx] of metadataColumnMap.entries()) {
      const raw = (row.cells[colIdx] || "").trim();

      if (textSlugs.has(slug)) {
        values.set(slug, raw || null);
      } else {
        values.set(slug, parseNumeric(raw));
      }
    }

    result.operators.push({
      operatorEmail,
      values,
    });
  }

  return result;
}
