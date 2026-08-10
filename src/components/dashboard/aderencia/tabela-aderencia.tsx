"use client";

import type { ReactNode } from "react";
import { IconCheck, IconClockCheck, IconX } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import type { AderenciaOperador, PausaAderencia } from "@/lib/d1-db/get-aderencia";

interface TabelaAderenciaProps {
  operadores: AderenciaOperador[];
  /** false quando a base do dia não tem horário salvo. */
  temHorario: boolean;
  toleranciaMin: number;
  /** Engrenagem de config, renderizada ao lado do título. */
  acoes?: ReactNode;
}

const TRACO = "—";

/** Marca de aderente / não aderente, discreta o bastante para uma tabela densa. */
function Marca({ ok }: { ok: boolean }) {
  return ok ? (
    <IconCheck size={14} className="text-success shrink-0" aria-label="dentro da tolerância" />
  ) : (
    <IconX size={14} className="text-danger shrink-0" aria-label="fora da tolerância" />
  );
}

/** Hora real + marca de aderência. Sem horário na base, vira só um traço. */
function CelulaHoraReal({
  hora,
  ok,
  mostrar,
}: {
  hora: string | null;
  ok: boolean;
  mostrar: boolean;
}) {
  if (!mostrar || !hora) {
    return <span className="text-muted-foreground/60 font-mono text-xs">{TRACO}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Marca ok={ok} />
      <span className="text-foreground font-mono text-xs tabular-nums">{hora}</span>
    </span>
  );
}

/** Hora esperada — sempre presente, mas em tom secundário (é a referência). */
function CelulaHoraMeta({ hora }: { hora: string }) {
  return (
    <span className="text-muted-foreground font-mono text-xs tabular-nums">{hora}</span>
  );
}

export function TabelaAderencia({
  operadores,
  temHorario,
  toleranciaMin,
  acoes,
}: TabelaAderenciaProps) {
  const comDados = operadores.filter((o) => o.temDados);

  return (
    <div className="space-y-3">
      {/* ── Título fora do card, engrenagem ao lado ─────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 text-foreground flex items-center gap-2 font-semibold">
            <IconClockCheck size={20} className="text-foreground" aria-hidden="true" />
            Aderência da Equipe
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Horário real de login e das pausas contra o esperado, com tolerância
            de {toleranciaMin} min para mais ou para menos.
          </p>
        </div>
        {acoes && <div className="shrink-0">{acoes}</div>}
      </div>

      {!temHorario && (
        <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-xs">
          <strong className="text-foreground font-semibold">
            A base deste dia não tem horário salvo.
          </strong>{" "}
          As colunas de horário e a aderência só são preenchidas em bases
          importadas depois que o upload passou a guardar a hora de cada evento.
          Tempo logado e indisponibilidade continuam corretos.
        </div>
      )}

      <StyledCard className="overflow-hidden p-0" withGradient>
        {comDados.length === 0 ? (
          <p className="ds-small text-muted-foreground p-6 text-center">
            Nenhum operador da equipe tem registro neste dia.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                  <th className="px-4 py-2.5 font-semibold">Operador</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Login</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Ader. Login</th>
                  <th className="px-3 py-2.5 text-center font-semibold">P10¹</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Hora¹</th>
                  <th className="px-3 py-2.5 text-center font-semibold">P20</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Hora</th>
                  <th className="px-3 py-2.5 text-center font-semibold">P10²</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Hora²</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Ader. Pausas</th>
                  <th className="px-3 py-2.5 text-center font-semibold">TL</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Indisp%</th>
                </tr>
              </thead>

              <tbody>
                {comDados.map((op) => {
                  const [p10a, p20, p10b] = op.pausas as [
                    PausaAderencia,
                    PausaAderencia,
                    PausaAderencia,
                  ];

                  return (
                    <tr
                      key={op.email}
                      className="border-border/20 hover:bg-muted/10 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground max-w-[200px] truncate px-4 py-2.5 text-xs font-medium">
                        {op.nome}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <span className="text-foreground font-mono text-xs tabular-nums">
                          {temHorario && op.horaLogin ? op.horaLogin : TRACO}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {temHorario && op.horaLogin ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Marca ok={op.aderenciaLogin} />
                            <span className="text-muted-foreground font-mono text-xs tabular-nums">
                              {op.metaLogin}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-mono text-xs">
                            {TRACO}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraReal
                          hora={p10a.horaReal}
                          ok={p10a.dentroTolerancia}
                          mostrar={temHorario}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraMeta hora={p10a.horaEsperada} />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraReal
                          hora={p20.horaReal}
                          ok={p20.dentroTolerancia}
                          mostrar={temHorario}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraMeta hora={p20.horaEsperada} />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraReal
                          hora={p10b.horaReal}
                          ok={p10b.dentroTolerancia}
                          mostrar={temHorario}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CelulaHoraMeta hora={p10b.horaEsperada} />
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {temHorario ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Marca ok={op.aderenciaPausasPercent >= 75} />
                            <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
                              {op.aderenciaPausasPercent}%
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-mono text-xs">
                            {TRACO}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            op.cumpriuMetaTempoLogado ? "text-foreground" : "text-danger"
                          }`}
                        >
                          {op.tempoLogado}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`font-mono text-xs font-semibold tabular-nums ${
                            op.indispPercent === null
                              ? "text-muted-foreground/60"
                              : op.cumpriuMetaIndisp
                                ? "text-foreground"
                                : "text-danger"
                          }`}
                        >
                          {op.indispPercent !== null
                            ? `${op.indispPercent.toFixed(1)}%`
                            : TRACO}
                        </span>
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
}
