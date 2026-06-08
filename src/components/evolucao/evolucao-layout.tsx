"use client";

import { useState } from "react";

import type {
  EvolucaoIndicador,
  EvolucaoOperador,
} from "@/lib/evolucao/types";

import { EvolucaoConsolidadoCard } from "./evolucao-consolidado-card";
import { EvolucaoEmptyState } from "./evolucao-empty-state";
import { EvolucaoGrafico } from "./evolucao-grafico";
import { EvolucaoTabs } from "./evolucao-tabs";

interface Props {
  data: EvolucaoOperador;
}

export function EvolucaoLayout({ data }: Props) {
  const [indicador, setIndicador] = useState<EvolucaoIndicador>("tx_retencao");

  if (data.meses.length === 0) {
    return <EvolucaoEmptyState />;
  }

  const serie = data.series[indicador];
  const umMesSo = data.meses.length === 1;

  return (
    <div className="space-y-5">
      <EvolucaoTabs ativo={indicador} onSelect={setIndicador} />

      {umMesSo && (
        <p className="ds-mono-sm text-muted-foreground">
          Evolução aparece a partir do 2º mês — por enquanto há só 1 mês
          registrado.
        </p>
      )}

      {/* flex-row no desktop: o gráfico ocupa o resto e o consolidado fica
          fixo ao lado. min-w-0 no item do gráfico é ESSENCIAL — sem ele o
          flex item cresce pra caber o conteúdo largo (gráfico com muitos
          meses) e empurra o consolidado pra fora; com min-w-0 ele respeita o
          espaço disponível e a rolagem interna do gráfico assume. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <EvolucaoGrafico serie={serie} />
        </div>
        <div className="shrink-0 lg:w-[280px]">
          <EvolucaoConsolidadoCard serie={serie} />
        </div>
      </div>
    </div>
  );
}
