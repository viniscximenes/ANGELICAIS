"use client";

import { useState } from "react";
import { IconUsers } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import type { AderenciaOperador } from "@/lib/d1-db/get-aderencia";

import { OperadorAderenciaDialog } from "./operador-aderencia-dialog";

interface OperadoresListaAderenciaProps {
  operadores: AderenciaOperador[];
  temHorario: boolean;
  toleranciaMin: number;
}

export function OperadoresListaAderencia({
  operadores,
  temHorario,
  toleranciaMin,
}: OperadoresListaAderenciaProps) {
  const [selecionado, setSelecionado] = useState<AderenciaOperador | null>(null);
  const [open, setOpen] = useState(false);

  const comDados = operadores.filter((o) => o.temDados);

  function abrir(op: AderenciaOperador) {
    setSelecionado(op);
    setOpen(true);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 text-foreground flex items-center gap-2 font-semibold">
          <IconUsers size={20} className="text-foreground" aria-hidden="true" />
          Operadores
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Clique no operador para ver as pausas do dia, a linha do tempo e a
          aderência individual.
        </p>
      </div>

      <StyledCard className="overflow-hidden p-0" withGradient>
        {comDados.length === 0 ? (
          <p className="ds-small text-muted-foreground p-6 text-center">
            Nenhum operador da equipe tem registro neste dia.
          </p>
        ) : (
          <ul className="divide-border/30 divide-y">
            {comDados.map((op) => (
              <li key={op.email}>
                <button
                  type="button"
                  onClick={() => abrir(op)}
                  className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                >
                  {/* Indicador pela meta de tempo logado (06:20). */}
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{
                      background: op.cumpriuMetaTempoLogado
                        ? "var(--success)"
                        : "var(--danger)",
                    }}
                  />

                  <span className="ds-small text-foreground min-w-0 flex-1 truncate font-medium">
                    {op.nome}
                  </span>

                  {temHorario && (
                    <span className="ds-mono-sm text-muted-foreground shrink-0 tabular-nums">
                      {op.aderenciaPausasPercent}% ader.
                    </span>
                  )}

                  <span
                    className={`ds-mono-sm shrink-0 font-semibold tabular-nums ${
                      op.cumpriuMetaTempoLogado ? "text-foreground" : "text-danger"
                    }`}
                  >
                    {op.tempoLogado}
                  </span>

                  <span
                    className={`ds-mono-sm shrink-0 text-right tabular-nums ${
                      op.indispPercent === null
                        ? "text-muted-foreground/60"
                        : op.cumpriuMetaIndisp
                          ? "text-muted-foreground"
                          : "text-danger"
                    }`}
                  >
                    {op.indispPercent !== null ? `${op.indispPercent.toFixed(1)}%` : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </StyledCard>

      <OperadorAderenciaDialog
        operador={selecionado}
        open={open}
        onOpenChange={setOpen}
        temHorario={temHorario}
        toleranciaMin={toleranciaMin}
      />
    </div>
  );
}
