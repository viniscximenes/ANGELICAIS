"use client";

import { useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { getDataPngHoje } from "@/components/dashboard/export-popup-png-theme";
import { StyledCard } from "@/components/gestor/styled-card";
import type { CardCorners } from "@/components/gestor/styled-card";
import type { AderenciaOperador } from "@/lib/d1-db/calcular-aderencia";

import {
  PAUSA_FIELDS,
  fmtPct,
  formatDiferenca,
  formatLogin,
  formatLogout,
} from "./format-operador-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { OperadorAnaliticoPngContent } from "./operador-analitico-png-content";

interface Props {
  operador: OperadorAnaliticoTempoIndisp | null;
  nomeExibido: string;
  aderencia: AderenciaOperador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperadorAnaliticoDialog({
  operador,
  nomeExibido,
  aderencia,
  open,
  onOpenChange,
}: Props) {
  const pngRef = useRef<HTMLDivElement>(null);

  if (!operador) return null;

  // Nome real (email antes do @) — sempre este no PNG, nunca nome fantasia.
  const nomeReal = operador.email.split("@")[0] || operador.email;
  const { header: dataHeader, file: dataFile } = getDataPngHoje();

  const resumo = [
    { label: "Tempo Logado", valor: operador.tempoLogado || "—" },
    { label: "% Indisponibilidade", valor: fmtPct(operador.indisponibilidade) },
    { label: "Hora Login", valor: formatLogin(operador.horaLogin) },
    { label: "Hora Logout", valor: formatLogout(operador.statusTL, operador.horaLogout) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-2xl bg-background border-border/80 p-6 shadow-2xl">
        <ExportPopupPngButton
          contentRef={pngRef}
          filename={`${nomeReal}_${dataFile}.png`}
          className="absolute top-2 right-10"
        />

        {/* Wrapper offscreen (tema claro forçado) — só existe pra captura do PNG */}
        <div
          aria-hidden="true"
          style={{ position: "fixed", top: "-99999px", left: "-99999px", pointerEvents: "none" }}
        >
          <OperadorAnaliticoPngContent
            ref={pngRef}
            operador={operador}
            nomeReal={nomeReal}
            dataHeader={dataHeader}
            aderencia={aderencia}
          />
        </div>

        <DialogHeader className="border-b border-dashed border-border/60 pb-3 space-y-1.5">
          <DialogTitle className="ds-h3 text-foreground font-semibold tracking-tight text-xl">
            {nomeExibido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ── Resumo ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.map((c, idx) => {
              const corners: CardCorners =
                idx === 0 ? "left" : idx === resumo.length - 1 ? "right" : "none";

              return (
                <StyledCard
                  key={c.label}
                  className="px-4 py-3.5 flex flex-col justify-center"
                  withGradient
                  corners={corners}
                >
                  <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                    {c.label}
                  </p>
                  <p className="ds-display text-2xl font-semibold tabular-nums text-foreground">
                    {c.valor}
                  </p>
                </StyledCard>
              );
            })}
          </div>

          {/* ── Aderência (real x programado) ─────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Aderência
            </h4>
            <StyledCard className="p-0 overflow-hidden" withGradient>
              {aderencia.forecast === null ? (
                <p className="ds-small text-muted-foreground p-6 text-center">
                  Horários programados não cadastrados para este operador.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                        <th className="px-4 py-2.5 font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Forecast</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Real</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Diferença</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aderencia.items.map((item) => (
                        <tr
                          key={item.label}
                          className="border-border/20 hover:bg-muted/10 border-b transition-colors last:border-0"
                        >
                          <td className="text-foreground px-4 py-2.5 text-xs font-medium">
                            {item.label}
                          </td>
                          <td className="text-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {item.horaForecast ?? "—"}
                          </td>
                          <td className="text-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {item.horaReal ?? "—"}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {formatDiferenca(item.diferencaMin)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs font-semibold">
                            {item.dentroTolerancia === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : item.dentroTolerancia ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                OK
                              </span>
                            ) : (
                              <span className="text-red-500 dark:text-red-400 font-medium">
                                FORA
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </StyledCard>
          </div>

          {/* ── Pausas detalhadas (d1_indisponibilidade) ──────────── */}
          {(() => {
            const pausasComDados = PAUSA_FIELDS.filter((f) => {
              const val = operador.pausas[f.key];
              return val && val !== "00:00:00" && val !== "—";
            });

            return (
              <div className="space-y-2">
                <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Pausas Detalhadas
                </h4>
                <StyledCard className="p-0 overflow-hidden" withGradient>
                  {pausasComDados.length === 0 ? (
                    <p className="ds-small text-muted-foreground p-6 text-center">
                      Nenhuma pausa registrada para este operador.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                            <th className="px-4 py-2.5 font-semibold">Pausa</th>
                            <th className="px-4 py-2.5 text-center font-semibold">Duração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pausasComDados.map((f) => {
                            const val = operador.pausas[f.key];
                            return (
                              <tr
                                key={f.key}
                                className="border-border/20 hover:bg-muted/10 border-b transition-colors last:border-0"
                              >
                                <td className="text-foreground px-4 py-2.5 text-xs font-medium">
                                  {f.label}
                                </td>
                                <td className="px-4 py-2.5 text-center font-mono text-xs text-foreground font-semibold">
                                  {val}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </StyledCard>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
