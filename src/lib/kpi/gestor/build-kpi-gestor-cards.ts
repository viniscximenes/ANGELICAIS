import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";

import { avaliarMetaGestor, formatMetaCondicao, type MetaGestorConfig } from "./avaliar-meta-gestor";
import { KPI_GESTOR_CARDS, type KpiGestorSecao } from "./kpi-gestor-cards-config";

export type KpiGestorCardSerial = {
  configSlug: string;
  label: string;
  secao: KpiGestorSecao;
  valorFormatado: string;
  /** false quando não há linha em kpi_gestor_snapshots pro slug/mês — card mostra "N/D". */
  temDado: boolean;
  status: "success" | "danger" | null;
  /** "≥ 63%" / "≤ 14.5%" / "Forecast" / etc — null quando sem meta OU sem dado. */
  metaCondicao: string | null;
};

/**
 * Monta os 24 cards de /kpi/gestor a partir do snapshot cru (valuesBySlug,
 * de kpi_gestor_snapshots) + metas configuradas pelo gestor. Puro/síncrono —
 * sem I/O — usado tanto pelos 3 meses recentes (page.tsx) quanto pelo mês
 * histórico buscado sob demanda (getKpiGestorMesHistoricoAction).
 */
export function buildKpiGestorCards(
  valuesBySlug: Map<string, number | null>,
  metas: Record<string, MetaGestorConfig>,
): KpiGestorCardSerial[] {
  const forecastChurn = valuesBySlug.get("forecast_churn") ?? null;
  const txRetencaoBruta = valuesBySlug.get("tx_retencao_bruta") ?? null;

  return KPI_GESTOR_CARDS.map((card) => {
    const valor = valuesBySlug.get(card.dataSlug) ?? null;
    const config = metas[card.configSlug];
    const status = avaliarMetaGestor(
      valor,
      config,
      { forecastChurn, txRetencaoBruta },
      card.valueType,
    );

    return {
      configSlug: card.configSlug,
      label: card.label,
      secao: card.secao,
      valorFormatado: valor === null ? "N/D" : formatKpiValue(valor, card.valueType),
      temDado: valor !== null,
      status,
      // Sem dado = sem avaliação — não mostra meta mesmo que configurada.
      metaCondicao: valor === null ? null : formatMetaCondicao(config, card.valueType),
    };
  });
}
