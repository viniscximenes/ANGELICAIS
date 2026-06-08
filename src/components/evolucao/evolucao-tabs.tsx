"use client";

import type { EvolucaoIndicador } from "@/lib/evolucao/types";
import { INDICADOR_LABEL } from "@/lib/evolucao/types";

const ORDER: EvolucaoIndicador[] = [
  "tx_retencao",
  "pedidos",
  "indisponibilidade",
  "abs",
  "tma",
];

interface Props {
  ativo: EvolucaoIndicador;
  onSelect: (indicador: EvolucaoIndicador) => void;
}

export function EvolucaoTabs({ ativo, onSelect }: Props) {
  return (
    <div
      role="tablist"
      className="elevation-1 inline-flex flex-wrap gap-1 rounded-md p-1"
    >
      {ORDER.map((ind) => {
        const isActive = ativo === ind;
        return (
          <button
            key={ind}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(ind)}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {INDICADOR_LABEL[ind]}
          </button>
        );
      })}
    </div>
  );
}
