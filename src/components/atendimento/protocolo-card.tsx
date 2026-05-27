"use client";

import { useEffect, useMemo, useState } from "react";

import { formatProtocolo } from "@/lib/atendimento/format-protocolo";
import type { ProtocoloState } from "@/lib/atendimento/types";

import { MotivoDropdown } from "./motivo-dropdown";
import { ProtocoloAvisosSection } from "./protocolo-avisos-section";
import { ProtocoloOutput } from "./protocolo-output";
import { ProtocoloResolucoesSection } from "./protocolo-resolucoes-section";
import { useSharedState } from "./shared-state";
import { TogglePill } from "./toggle-pill";

const INITIAL: ProtocoloState = {
  dadosOk: false,
  motivo: "",
  resolucoes: [],
  planoTrocaTexto: "",
  descontoTexto: "",
  avisoRetencaoMarcado: false,
  avisosCancelamento: [],
  ofertasRecusadas: [],
  prioridadeOsAoCancelar: false,
};

export function ProtocoloCard() {
  const { resetVersion, resetAll } = useSharedState();
  const [state, setState] = useState<ProtocoloState>(INITIAL);

  useEffect(() => {
    if (resetVersion > 0) setState(INITIAL);
  }, [resetVersion]);

  const protocoloText = useMemo(() => formatProtocolo(state), [state]);

  function handleReset() {
    if (confirm("Limpar tudo? Esta ação não pode ser desfeita.")) {
      setState(INITIAL);
      resetAll();
    }
  }

  return (
    <div className="elevation-1 overflow-hidden rounded-xl">
      {/* Header denso */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="ds-mono text-muted-foreground text-[13px] uppercase tracking-wider">
            Montador de Protocolo
          </h2>
          <span
            className="ds-mono text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {state.resolucoes.length === 0
              ? "—"
              : `${state.resolucoes.length} resolução${state.resolucoes.length > 1 ? "(ões)" : ""}`}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Linha 1: Dados + Motivo lado a lado */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="flex flex-col sm:col-span-5">
            {/* Espaçador pra alinhar com o label "Motivo" da coluna direita */}
            <div style={{ height: "16px" }} />
            <TogglePill
              checked={state.dadosOk}
              onClick={() =>
                setState((s) => ({ ...s, dadosOk: !s.dadosOk }))
              }
              label="Dados confirmados"
              tone="success"
            />
          </div>
          <div className="space-y-1 sm:col-span-7">
            <label className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
              Motivo
            </label>
            <MotivoDropdown
              value={state.motivo}
              onChange={(v) => setState((s) => ({ ...s, motivo: v }))}
            />
          </div>
        </div>

        {/* Divisória sutil */}
        <div style={{ height: "1px", background: "var(--border)" }} />

        {/* Resoluções */}
        <ProtocoloResolucoesSection
          state={state}
          onChange={(updates) => setState((s) => ({ ...s, ...updates }))}
        />

        {/* Avisos condicionais */}
        <ProtocoloAvisosSection
          state={state}
          onChange={(updates) => setState((s) => ({ ...s, ...updates }))}
        />
      </div>

      {/* Output em destaque */}
      <ProtocoloOutput protocoloText={protocoloText} onReset={handleReset} />
    </div>
  );
}
