"use client";

import { IconUser } from "@tabler/icons-react";

import type { AgenteRegistros, Tema, TemaTipo } from "@/lib/db/types";
import { RegistroRow } from "./registro-row";

interface AgenteRegistroCardProps {
  agente: AgenteRegistros;
  dataRef: string;
  temasPausa: Tema[];
  temasTempoLogado: Tema[];
  onFinalizado: (
    agentUser: string,
    tipo: TemaTipo,
    reasonCode: string | null,
    temaNome: string,
    textoGerado: string,
  ) => void;
}

export function AgenteRegistroCard({
  agente,
  dataRef,
  temasPausa,
  temasTempoLogado,
  onFinalizado,
}: AgenteRegistroCardProps) {
  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <div className="flex items-center gap-2">
        <IconUser size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 className="ds-body font-semibold">{agente.agentUser}</h3>
      </div>

      <div className="space-y-3">
        {agente.registros.map((registro, idx) => (
          <RegistroRow
            key={`${registro.tipo}-${registro.reason_code ?? "logado"}-${idx}`}
            registro={registro}
            dataRef={dataRef}
            agentUser={agente.agentUser}
            agentName={agente.agentName}
            temas={registro.tipo === "pausa" ? temasPausa : temasTempoLogado}
            onFinalizado={(tipo, reasonCode, temaNome, textoGerado) =>
              onFinalizado(agente.agentUser, tipo, reasonCode, temaNome, textoGerado)
            }
          />
        ))}
      </div>
    </div>
  );
}
