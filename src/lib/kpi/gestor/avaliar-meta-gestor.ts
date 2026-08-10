import type { KpiValueType } from "@/lib/kpi/types";

export type MetaDirecao = "gte" | "lte" | "forecast" | "diff_bruta" | null;

export type MetaGestorConfig = {
  meta: number | string | null;
  direcao: MetaDirecao;
};

export type MetaContexto = {
  forecastChurn: number | null;
  txRetencaoBruta: number | null;
};

/** "12:11" (MM:SS) ou "01:02:03" (HH:MM:SS) → segundos. null se inválido. */
export function parseMetaTempoSegundos(str: string): number | null {
  const partes = str.trim().split(":").map((p) => parseInt(p, 10));
  if (partes.some((p) => Number.isNaN(p))) return null;

  if (partes.length === 2) {
    const [m, s] = partes;
    return m * 60 + s;
  }
  if (partes.length === 3) {
    const [h, m, s] = partes;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function metaNumerica(meta: number | string | null, valueType: KpiValueType): number | null {
  if (meta === null) return null;
  if (typeof meta === "number") return meta;
  if (valueType === "time") return parseMetaTempoSegundos(meta);
  const n = Number(meta);
  return Number.isNaN(n) ? null : n;
}

/**
 * Avalia o status de um KPI do gestor contra a meta configurada.
 * - "gte": valor >= meta → OK
 * - "lte": valor <= meta → OK
 * - "forecast": compara com forecastChurn (contexto) — meta não é usada
 * - "diff_bruta": valor >= (txRetencaoBruta + meta) → OK (meta tipicamente negativa)
 * - null (sem direção) ou valor ausente: sem status
 */
export function avaliarMetaGestor(
  valor: number | null,
  config: MetaGestorConfig | undefined,
  contexto: MetaContexto,
  valueType: KpiValueType = "number",
): "success" | "danger" | null {
  if (!config?.direcao || valor === null) return null;

  switch (config.direcao) {
    case "gte": {
      const meta = metaNumerica(config.meta, valueType);
      if (meta === null) return null;
      return valor >= meta ? "success" : "danger";
    }
    case "lte": {
      const meta = metaNumerica(config.meta, valueType);
      if (meta === null) return null;
      return valor <= meta ? "success" : "danger";
    }
    case "forecast": {
      if (contexto.forecastChurn === null) return null;
      return valor <= contexto.forecastChurn ? "success" : "danger";
    }
    case "diff_bruta": {
      const meta = metaNumerica(config.meta, valueType);
      if (meta === null || contexto.txRetencaoBruta === null) return null;
      const limiar = contexto.txRetencaoBruta + meta;
      return valor >= limiar ? "success" : "danger";
    }
    default:
      return null;
  }
}

/** "≥ 63%" / "≤ 14.5%" / "Forecast" / "Bruta -5%" — condição a exibir (sem o prefixo "Meta"). */
export function formatMetaCondicao(
  config: MetaGestorConfig | undefined,
  valueType: KpiValueType,
): string | null {
  if (!config?.direcao) return null;

  if (config.direcao === "forecast") return "Forecast";

  if (config.direcao === "diff_bruta") {
    if (config.meta === null) return null;
    const sinal = Number(config.meta) >= 0 ? "+" : "";
    return `Bruta ${sinal}${config.meta}%`;
  }

  if (config.meta === null) return null;
  const simbolo = config.direcao === "gte" ? "≥" : "≤";
  const sufixo = valueType === "percent" || valueType === "percent_negative" ? "%" : "";
  return `${simbolo} ${config.meta}${sufixo}`;
}
