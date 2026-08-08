"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";

import { getRegistrosDiaAction } from "@/lib/db/actions/get-registros-dia-action";
import type { ContagemPorDia } from "@/lib/db/detectar-registros";
import type { AgenteRegistros, Tema, TemaTipo } from "@/lib/db/types";
import { AgenteRegistroCard } from "./agente-registro-card";
import { DiaSelector } from "./dia-selector";
import { ExportarExcelSection } from "./exportar-excel-section";

interface DiarioDeBordoClientProps {
  dias: ContagemPorDia[];
  temasPausa: Tema[];
  temasTempoLogado: Tema[];
}

export function DiarioDeBordoClient({
  dias,
  temasPausa,
  temasTempoLogado,
}: DiarioDeBordoClientProps) {
  const [selectedDay, setSelectedDay] = useState(dias[0]?.dataRef ?? "");
  const [agentes, setAgentes] = useState<AgenteRegistros[]>([]);
  const [isLoading, startLoadTransition] = useTransition();

  useEffect(() => {
    if (!selectedDay) {
      setAgentes([]);
      return;
    }

    startLoadTransition(async () => {
      const result = await getRegistrosDiaAction(selectedDay);
      setAgentes(result);
    });
  }, [selectedDay]);

  function handleFinalizado(
    agentUser: string,
    tipo: TemaTipo,
    reasonCode: string | null,
    temaNome: string,
    textoGerado: string,
  ) {
    setAgentes((prev) =>
      prev.map((agente) => {
        if (agente.agentUser !== agentUser) return agente;
        return {
          ...agente,
          registros: agente.registros.map((r) => {
            if (r.tipo !== tipo || (r.reason_code ?? "") !== (reasonCode ?? "")) {
              return r;
            }
            return { ...r, finalizado: true, temaNome, textoGerado };
          }),
        };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <DiaSelector dias={dias} value={selectedDay} onChange={setSelectedDay} />

      {isLoading && (
        <div className="flex items-center gap-2 py-8">
          <IconLoader2 size={16} className="animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="ds-small text-muted-foreground">Processando o dia...</span>
        </div>
      )}

      {!isLoading && selectedDay && agentes.length === 0 && (
        <p className="ds-small text-muted-foreground">
          Nenhum registro de atenção detectado nesse dia.
        </p>
      )}

      {!isLoading && agentes.length > 0 && (
        <div className="space-y-4">
          {agentes.map((agente) => (
            <AgenteRegistroCard
              key={agente.agentUser}
              agente={agente}
              dataRef={selectedDay}
              temasPausa={temasPausa}
              temasTempoLogado={temasTempoLogado}
              onFinalizado={handleFinalizado}
            />
          ))}
        </div>
      )}

      <ExportarExcelSection />
    </div>
  );
}
