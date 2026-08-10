"use client";

import { IconCheck, IconX } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StyledCard } from "@/components/gestor/styled-card";
import type { AderenciaOperador } from "@/lib/d1-db/get-aderencia";

import { TimelineDia } from "./timeline-dia";

interface Props {
  operador: AderenciaOperador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  temHorario: boolean;
  toleranciaMin: number;
}

const TRACO = "—";

function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${String(s % 60).padStart(2, "0")}s`;
  return `${s}s`;
}

/** "+8 min" / "−3 min" / "no horário". */
function formatarDesvio(desvioMin: number | null): string {
  if (desvioMin === null) return TRACO;
  if (desvioMin === 0) return "no horário";
  return desvioMin > 0 ? `+${desvioMin} min` : `−${Math.abs(desvioMin)} min`;
}

function rotuloPausa(tipo: string, ordem: number): string {
  if (tipo === "P20") return "Pausa 20";
  return ordem === 1 ? "Pausa 10 (1ª)" : "Pausa 10 (2ª)";
}

export function OperadorAderenciaDialog({
  operador,
  open,
  onOpenChange,
  temHorario,
  toleranciaMin,
}: Props) {
  if (!operador) return null;

  const resumo = [
    { label: "Tempo Logado", valor: operador.tempoLogado },
    {
      label: "Indisponibilidade",
      valor:
        operador.indispPercent !== null ? `${operador.indispPercent.toFixed(1)}%` : TRACO,
    },
    {
      label: "Aderência",
      valor: temHorario ? `${operador.aderenciaPausasPercent}%` : TRACO,
    },
    {
      label: "Login",
      valor: temHorario && operador.horaLogin ? operador.horaLogin : TRACO,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-tema bg-background border-border/80 max-h-[85vh] overflow-y-auto p-6 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-border/60 space-y-1.5 border-b border-dashed pb-3">
          <DialogTitle className="ds-h3 text-foreground text-xl font-semibold tracking-tight">
            {operador.nome}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            {operador.turno === "tarde"
              ? "Turno da tarde"
              : operador.turno === "manha"
                ? "Turno da manhã"
                : "Turno não identificado"}
            {temHorario && operador.horaLogin && (
              <>
                {" "}
                · meta de login {operador.metaLogin} (
                {formatarDesvio(operador.desvioLoginMin)})
              </>
            )}
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ── Resumo ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.map((c, idx) => (
              <StyledCard
                key={c.label}
                className="flex flex-col justify-center px-4 py-3.5"
                withGradient
                corners={idx === 0 ? "left" : idx === resumo.length - 1 ? "right" : "none"}
              >
                <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                  {c.label}
                </p>
                <p className="ds-display text-foreground text-2xl font-semibold tabular-nums">
                  {c.valor}
                </p>
              </StyledCard>
            ))}
          </div>

          {/* ── Aderência item a item ──────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Aderência do dia
            </h4>
            <StyledCard className="overflow-hidden p-0" withGradient>
              {!temHorario ? (
                <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                  A base deste dia não tem horário salvo — não há como comparar
                  com os horários esperados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                        <th className="px-4 py-2.5 font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Esperado</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Real</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Desvio</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Duração</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-border/20 border-b">
                        <td className="text-foreground px-4 py-2.5 text-xs font-medium">
                          Login
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                          {operador.metaLogin}
                        </td>
                        <td className="text-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                          {operador.horaLogin ?? TRACO}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                          {formatarDesvio(operador.desvioLoginMin)}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                          {TRACO}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {operador.aderenciaLogin ? (
                            <IconCheck size={15} className="text-success inline" />
                          ) : (
                            <IconX size={15} className="text-danger inline" />
                          )}
                        </td>
                      </tr>

                      {operador.pausas.map((p) => (
                        <tr
                          key={`${p.tipo}-${p.ordem}`}
                          className="border-border/20 border-b last:border-0"
                        >
                          <td className="text-foreground px-4 py-2.5 text-xs font-medium">
                            {rotuloPausa(p.tipo, p.ordem)}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                            {p.horaEsperada}
                          </td>
                          <td className="text-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                            {p.horaReal ?? TRACO}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs tabular-nums">
                            {formatarDesvio(p.desvioMin)}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {p.horaReal ? formatarDuracao(p.duracaoSeg) : TRACO}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.dentroTolerancia ? (
                              <IconCheck size={15} className="text-success inline" />
                            ) : (
                              <IconX size={15} className="text-danger inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </StyledCard>
            <p className="text-muted-foreground text-[11px]">
              {operador.itensOk} de {operador.itensAvaliados} itens dentro da
              tolerância de {toleranciaMin} min.
            </p>
          </div>

          {/* ── Timeline ───────────────────────────────────────── */}
          {temHorario && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Linha do tempo
              </h4>
              <StyledCard className="overflow-hidden p-0" withGradient>
                <TimelineDia operador={operador} />
              </StyledCard>
            </div>
          )}

          {/* ── Todas as pausas do dia ─────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Pausas do dia ({operador.eventos.length})
            </h4>
            <StyledCard className="overflow-hidden p-0" withGradient>
              {operador.eventos.length === 0 ? (
                <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                  Nenhuma pausa registrada para este operador no dia.
                </p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-background/95 sticky top-0 backdrop-blur">
                      <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                        <th className="px-4 py-2.5 font-semibold">Hora</th>
                        <th className="px-4 py-2.5 font-semibold">Motivo</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Duração</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Indisp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operador.eventos.map((e, i) => (
                        <tr
                          key={`${e.reasonCode}-${e.hora}-${i}`}
                          className="border-border/20 hover:bg-muted/10 border-b transition-colors last:border-0"
                        >
                          <td className="text-foreground px-4 py-2 font-mono text-xs tabular-nums">
                            {e.hora ?? TRACO}
                          </td>
                          <td className="text-foreground px-4 py-2 text-xs">
                            {e.reasonCode}
                          </td>
                          <td className="text-muted-foreground px-4 py-2 text-center font-mono text-xs">
                            {formatarDuracao(e.duracaoSeg)}
                          </td>
                          <td className="text-muted-foreground px-4 py-2 text-center text-xs">
                            {e.contaIndisp ? "sim" : "não"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </StyledCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
