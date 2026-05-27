"use client";

import {
  OFERTAS_RECUSADAS,
  RESOLUCOES,
  type OfertaRecusadaTipo,
  type ProtocoloState,
  type ResolucaoTipo,
} from "@/lib/atendimento/types";

import { TogglePill } from "./toggle-pill";

interface Props {
  state: ProtocoloState;
  onChange: (updates: Partial<ProtocoloState>) => void;
}

export function ProtocoloResolucoesSection({ state, onChange }: Props) {
  const isCancelou = state.resolucoes.includes("cancelou");

  function toggleResolucao(value: ResolucaoTipo) {
    if (value === "cancelou") {
      if (isCancelou) {
        onChange({
          resolucoes: state.resolucoes.filter((r) => r !== "cancelou"),
          ofertasRecusadas: [],
          avisosCancelamento: [],
        });
      } else {
        // Marca cancelou — REMOVE TUDO menos cancelou (totalmente exclusivo)
        onChange({
          resolucoes: ["cancelou"],
          planoTrocaTexto: "",
          descontoTexto: "",
          avisoRetencaoMarcado: false,
        });
      }
      return;
    }

    const novas = state.resolucoes.includes(value)
      ? state.resolucoes.filter((r) => r !== value)
      : [...state.resolucoes, value];

    onChange({ resolucoes: novas });
  }

  function toggleOfertaRecusada(value: OfertaRecusadaTipo) {
    const novas = state.ofertasRecusadas.includes(value)
      ? state.ofertasRecusadas.filter((x) => x !== value)
      : [...state.ofertasRecusadas, value];
    onChange({ ofertasRecusadas: novas });
  }

  return (
    <div className="space-y-1.5">
      <label className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
        Resolução
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RESOLUCOES.map((r) => {
          const isBloqueada = isCancelou && r.value !== "cancelou";
          const tone: "success" | "danger" =
            r.value === "cancelou" ? "danger" : "success";

          return (
            <TogglePill
              key={r.value}
              checked={state.resolucoes.includes(r.value as ResolucaoTipo)}
              onClick={() => toggleResolucao(r.value as ResolucaoTipo)}
              label={r.label}
              disabled={isBloqueada}
              tone={tone}
            />
          );
        })}
      </div>

      {/* Texto livre inline — plano novo */}
      {!isCancelou && state.resolucoes.includes("troca") && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="ds-mono text-muted-foreground shrink-0 text-[11px] uppercase tracking-wider">
            Plano →
          </span>
          <input
            type="text"
            value={state.planoTrocaTexto}
            onChange={(e) => onChange({ planoTrocaTexto: e.target.value })}
            placeholder="600M R$ 79,99 12 meses"
            className="ds-mono flex-1 rounded px-2 py-1 text-[13px]"
            style={{
              border: "1px solid var(--border)",
              background: "var(--background)",
            }}
          />
        </div>
      )}

      {/* Texto livre inline — desconto */}
      {!isCancelou && state.resolucoes.includes("desconto") && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="ds-mono text-muted-foreground shrink-0 text-[11px] uppercase tracking-wider">
            Desconto →
          </span>
          <input
            type="text"
            value={state.descontoTexto}
            onChange={(e) => onChange({ descontoTexto: e.target.value })}
            placeholder="30%"
            className="ds-mono flex-1 rounded px-2 py-1 text-[13px]"
            style={{
              border: "1px solid var(--border)",
              background: "var(--background)",
            }}
          />
        </div>
      )}

      {/* Ofertas recusadas — só quando cancelou */}
      {isCancelou && (
        <div className="mt-3 space-y-1.5">
          <label className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
            Ofertas Recusadas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OFERTAS_RECUSADAS.map((o) => (
              <TogglePill
                key={o.value}
                checked={state.ofertasRecusadas.includes(
                  o.value as OfertaRecusadaTipo,
                )}
                onClick={() =>
                  toggleOfertaRecusada(o.value as OfertaRecusadaTipo)
                }
                label={o.label}
                tone="danger"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
