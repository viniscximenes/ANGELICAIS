"use client";

import {
  AVISOS_CANCELAMENTO,
  type AvisoCancelamentoTipo,
  type ProtocoloState,
} from "@/lib/atendimento/types";

import { TogglePill } from "./toggle-pill";

interface Props {
  state: ProtocoloState;
  onChange: (updates: Partial<ProtocoloState>) => void;
}

export function ProtocoloAvisosSection({ state, onChange }: Props) {
  const isCancelou = state.resolucoes.includes("cancelou");
  const isPlanoOuDesconto =
    state.resolucoes.includes("troca") ||
    state.resolucoes.includes("desconto");

  // Retenção plano/desconto: 1 só checkbox
  if (isPlanoOuDesconto && !isCancelou) {
    return (
      <div className="space-y-1.5">
        <label className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
          Aviso Dado
        </label>
        <TogglePill
          checked={state.avisoRetencaoMarcado}
          onClick={() =>
            onChange({ avisoRetencaoMarcado: !state.avisoRetencaoMarcado })
          }
          label="Ciente da fidelidade renovada e proporcional de uso"
          tone="success"
        />
      </div>
    );
  }

  // Cancelamento: 8 cards específicos
  if (isCancelou) {
    const toggleAviso = (value: AvisoCancelamentoTipo) => {
      const novas = state.avisosCancelamento.includes(value)
        ? state.avisosCancelamento.filter((a) => a !== value)
        : [...state.avisosCancelamento, value];
      onChange({ avisosCancelamento: novas });
    };

    return (
      <div className="space-y-1.5">
        <label className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
          Avisos de Cancelamento
        </label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {AVISOS_CANCELAMENTO.map((a) => (
            <TogglePill
              key={a.value}
              checked={state.avisosCancelamento.includes(
                a.value as AvisoCancelamentoTipo,
              )}
              onClick={() => toggleAviso(a.value as AvisoCancelamentoTipo)}
              label={a.label}
              tone="danger"
            />
          ))}
        </div>
      </div>
    );
  }

  // Outras resoluções (argumentação, reparo, prioridade O.S): sem avisos
  return null;
}
