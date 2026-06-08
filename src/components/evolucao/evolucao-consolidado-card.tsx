import { formatValorIndicador } from "@/lib/evolucao/format";
import { INDICADOR_LABEL } from "@/lib/evolucao/types";
import type { SerieIndicador } from "@/lib/evolucao/types";

interface Props {
  serie: SerieIndicador;
}

export function EvolucaoConsolidadoCard({ serie }: Props) {
  const n = serie.mesesConsiderados;
  const tipoLabel = serie.tipoConsolidado === "acumulado" ? "acumulado" : "média";

  return (
    <div className="elevation-1 flex flex-col gap-2 rounded-xl p-5">
      <p className="ds-small text-muted-foreground tracking-wider uppercase">
        {INDICADOR_LABEL[serie.indicador]} — Consolidado
      </p>

      <p className="ds-display" style={{ fontSize: "2rem" }}>
        {formatValorIndicador(serie.indicador, serie.consolidado)}
      </p>

      <p className="ds-mono-sm text-muted-foreground">
        {tipoLabel} de {n} {n === 1 ? "mês" : "meses"}
      </p>
    </div>
  );
}
