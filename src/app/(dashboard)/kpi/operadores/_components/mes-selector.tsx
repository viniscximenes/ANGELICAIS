"use client";

import { SegmentedControl } from "./segmented-control";
import { anoAbreviado, anoDoMes, formatMesAbrev, formatMesPorExtenso } from "./mes-format";

interface MesSelectorProps {
  /** mes_ref (desc, mais recente primeiro) — mesma lista/quantidade de hoje. */
  meses: string[];
  mesSelecionado: string;
  onChange: (mesRef: string) => void;
  /** mes_ref sendo buscado sob demanda (getKpiMesHistoricoAction), se houver. */
  carregandoMes?: string | null;
}

/**
 * Seletor de mês — fininho em cima do SegmentedControl genérico
 * (_components/segmented-control.tsx), que também é usado pelo modo do RV
 * em kpi-equipe-section.tsx. Só monta os `items`: sem "2026" solto no
 * controle — só os meses de um ano DIFERENTE do mês mais recente (meses[0])
 * ganham o sufixo abreviado inline ("Dez/25"); meses do ano corrente ficam
 * só com o nome ("Set").
 */
export function MesSelector({ meses, mesSelecionado, onChange, carregandoMes = null }: MesSelectorProps) {
  const anoMaisRecente = meses.length > 0 ? anoDoMes(meses[0]) : "";

  const items = meses.map((mesRef) => ({
    value: mesRef,
    label:
      anoDoMes(mesRef) !== anoMaisRecente
        ? `${formatMesAbrev(mesRef)}/${anoAbreviado(mesRef)}`
        : formatMesAbrev(mesRef),
    ariaLabel: formatMesPorExtenso(mesRef),
  }));

  return (
    <SegmentedControl
      items={items}
      value={mesSelecionado}
      onChange={onChange}
      ariaLabel="Mês de referência"
      layoutId="mes-selector-indicador"
      loadingValue={carregandoMes}
    />
  );
}
