"use client";

import type { OfertaPermitida } from "@/lib/atendimento/types";
import type { Plano } from "@/lib/config/planos/types";

import { DescontoOfertaCard } from "./desconto-oferta-card";

interface Props {
  plano: Plano;
  ofertas: OfertaPermitida[];
}

export function DescontoOfertasList({ plano, ofertas }: Props) {
  if (ofertas.length === 0) {
    return (
      <div
        className="elevation-2 rounded-md p-4 text-center"
        style={{ border: "1px solid var(--border)" }}
      >
        <p className="ds-mono-sm text-muted-foreground">
          Nenhuma oferta permitida para este perfil de cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="ds-mono-sm text-muted-foreground">Ofertas permitidas:</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ofertas.map((o, i) => (
          <DescontoOfertaCard
            key={`${o.descontoMaxPct}-${o.duracaoMeses}-${i}`}
            plano={plano}
            oferta={o}
          />
        ))}
      </div>
    </div>
  );
}
