"use client";

import { useEffect, useState } from "react";

import { PageTransition } from "@/components/motion/page-transition";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import { refreshIndisponibilidadeAction } from "@/lib/d1-db/actions/refresh-indisponibilidade-action";
import { refreshTempoLogadoAction } from "@/lib/d1-db/actions/refresh-tempo-logado-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";

import { CardsResumoAnalitico } from "./cards-resumo-analitico";
import { mergeOperadoresTempoIndisp } from "./merge-tempo-indisp";
import { OperadoresListaAnalitico } from "./operadores-lista-analitico";
import { PausasDetalhadasAnalitico } from "./pausas-detalhadas-analitico";

// Reconsulta d1_tempo_logado + d1_indisponibilidade a cada 30s, sem F5 —
// mesmo intervalo usado em GestorTempoLogadoIndispSection.
const POLL_INTERVAL_MS = 30_000;

interface AnaliticoTempoIndispSectionProps {
  gestora: string;
  operadoresTempoLogadoIniciais: GestorTempoLogadoLinha[];
  operadoresIndisponibilidadeIniciais: GestorIndispLinha[];
  horaReportInicial: string | null;
  emailsEquipe: string[];
  pausasProgramadas: PausaProgramadaDb[];
  toleranciaMin: number;
}

export function AnaliticoTempoIndispSection({
  gestora,
  operadoresTempoLogadoIniciais,
  operadoresIndisponibilidadeIniciais,
  horaReportInicial,
  emailsEquipe,
  pausasProgramadas,
  toleranciaMin,
}: AnaliticoTempoIndispSectionProps) {
  const [operadoresTL, setOperadoresTL] = useState(operadoresTempoLogadoIniciais);
  const [operadoresIndisp, setOperadoresIndisp] = useState(operadoresIndisponibilidadeIniciais);
  const [horaReport, setHoraReport] = useState(horaReportInicial);

  useEffect(() => {
    let active = true;

    async function refetch() {
      const [tlResult, indispResult] = await Promise.all([
        refreshTempoLogadoAction(),
        refreshIndisponibilidadeAction(),
      ]);
      if (!active) return;
      if (tlResult.success) {
        setOperadoresTL(tlResult.operadores);
        setHoraReport(tlResult.horaReport);
      }
      if (indispResult.success) {
        setOperadoresIndisp(indispResult.operadores);
      }
    }

    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const operadoresMerged = mergeOperadoresTempoIndisp(operadoresTL, operadoresIndisp);

  const hasDados = operadoresMerged.some(
    (op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null,
  );

  const horaCurta =
    horaReport && horaReport !== "—" && horaReport !== "00:00" && horaReport !== "00:00:00"
      ? horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport
      : null;

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: var(--border) transparent !important;
              }
              html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
              }
              html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: var(--border) !important;
                border-radius: 4px !important;
              }
              html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: var(--muted-foreground) !important;
              }
            `,
          }}
        />
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Analítico</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Tempo Logado &amp; Indisponibilidade · {gestora}
                {horaCurta && <> · report às {horaCurta}</>}
              </span>
            </div>
          </header>

          {!hasDados ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 elevation-1 bg-card border border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[350px]">
                <div className="max-w-md space-y-3">
                  <h3 className="ds-h3 text-foreground font-semibold">
                    Nenhum dado encontrado
                  </h3>
                  <p className="ds-body text-muted-foreground text-sm">
                    Não existem registros de tempo logado ou indisponibilidade
                    cadastrados no banco para a sua equipe hoje.
                  </p>
                </div>
              </div>

              {/* Painel da Equipe Mapeada */}
              <div className="elevation-1 bg-card border border-border/60 rounded-xl p-6 space-y-4 flex flex-col">
                <div>
                  <h4 className="ds-mono-sm font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Mapeamento de Equipe
                  </h4>
                  <p className="ds-body text-foreground mt-1 font-semibold text-sm">
                    {emailsEquipe.length} operadores
                  </p>
                </div>

                <div className="flex-1 min-h-[200px] max-h-[350px] overflow-y-auto border border-border/40 rounded-lg p-3 bg-black/5 space-y-1.5 scrollbar-tema">
                  {emailsEquipe.length === 0 ? (
                    <p className="ds-small text-muted-foreground text-center py-8">
                      Nenhum operador na equipe.
                    </p>
                  ) : (
                    emailsEquipe.map((email) => (
                      <div
                        key={email}
                        className="ds-mono-sm px-2.5 py-1 bg-muted/40 rounded border border-border/20 text-muted-foreground truncate text-xs"
                      >
                        {email}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <CardsResumoAnalitico
                operadoresTempoLogado={operadoresTL}
                operadoresIndisponibilidade={operadoresIndisp}
              />

              <OperadoresListaAnalitico
                operadores={operadoresMerged}
                pausasProgramadas={pausasProgramadas}
                toleranciaMin={toleranciaMin}
              />

              <PausasDetalhadasAnalitico operadores={operadoresIndisp} />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
