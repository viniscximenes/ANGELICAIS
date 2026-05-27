"use client";

import { useEffect, useState } from "react";

import type { OfertaPermitida } from "@/lib/atendimento/types";
import type { Plano } from "@/lib/config/planos/types";

interface Props {
  plano: Plano;
  oferta: OfertaPermitida;
}

export function DescontoOfertaCard({ plano, oferta }: Props) {
  const [pct, setPct] = useState(oferta.descontoMaxPct);

  useEffect(() => {
    setPct(oferta.descontoMaxPct);
  }, [oferta.descontoMaxPct]);

  const valorFinal = plano.valor * (1 - pct / 100);

  return (
    <div
      className="elevation-2 space-y-2 rounded-md p-3"
      style={{ border: "1px solid var(--border)" }}
    >
      <div>
        <p className="ds-h2" style={{ fontSize: "1rem" }}>
          Até {oferta.descontoMaxPct}%
        </p>
        <p className="ds-mono-sm text-muted-foreground">
          por {oferta.duracaoMeses} meses
        </p>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={oferta.descontoMaxPct}
          step={1}
          value={pct}
          onChange={(e) => setPct(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <div className="mt-1 flex items-baseline justify-between">
          <span className="ds-mono-sm text-muted-foreground">{pct}%</span>
          <span className="ds-mono">
            R$ {valorFinal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
    </div>
  );
}
