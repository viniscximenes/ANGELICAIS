import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { KpiValueType } from "@/lib/kpi/types";

export type MetaDirecao = "gte" | "lte" | "forecast" | "diff_bruta" | null;

export type MetaGestorConfig = {
  meta: number | string | null;
  direcao: MetaDirecao;
};

type MetaContexto = {
  forecastChurn: number | null;
  txRetencaoBruta: number | null;
};

/** "12:11" (MM:SS) ou "01:02:03" (HH:MM:SS) → segundos. null se inválido. */
function parseMetaTempoSegundos(str: string): number | null {
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

/**
 * "mínimo 63%" / "máximo 14.5%" / "máximo 2068" (Churn, valor de
 * forecast_churn) / "Bruta -5%" — condição a exibir (sem o prefixo "meta:").
 * Sem símbolos de comparação (≥/≤/</>) — só texto, pedido explícito: os
 * glyphs matemáticos caem no fallback do navegador (a fonte do tema,
 * Instrument Sans, não tem esses glyphs), destoando visualmente do resto
 * do card.
 */
export function formatMetaCondicao(
  config: MetaGestorConfig | undefined,
  valueType: KpiValueType,
  /** valuesBySlug.get("forecast_churn") do mesmo snapshot — único uso: meta do Churn (direção "forecast"). */
  forecastChurn: number | null = null,
): string | null {
  if (!config?.direcao) return null;

  if (config.direcao === "forecast") {
    // Churn: "quanto menor, melhor" (avaliarMetaGestor: valor <= forecastChurn
    // = OK) — mesma semântica de "lte", por isso "máximo" aqui também, com o
    // valor NUMÉRICO de forecast_churn (não mais o texto genérico "Forecast").
    // Sem forecast_churn pro mês/supervisor: sem linha de meta (mesmo
    // comportamento de qualquer outro card sem meta configurada).
    if (forecastChurn === null) return null;
    return `máximo ${formatKpiValue(forecastChurn, valueType)}`;
  }

  if (config.direcao === "diff_bruta") {
    if (config.meta === null) return null;
    const sinal = Number(config.meta) >= 0 ? "+" : "";
    return `Bruta ${sinal}${config.meta}%`;
  }

  if (config.meta === null) return null;
  const sufixo = valueType === "percent" || valueType === "percent_negative" ? "%" : "";
  // meta de "time" já vem como string formatada ("13:00") — sem sufixo.
  const valorMeta = typeof config.meta === "number" ? `${config.meta}${sufixo}` : config.meta;
  return config.direcao === "gte" ? `mínimo ${valorMeta}` : `máximo ${valorMeta}`;
}
