"use client";

import type { AderenciaOperador } from "@/lib/d1-db/get-aderencia";

interface TimelineDiaProps {
  operador: AderenciaOperador;
}

/** "HH:MM" -> minutos desde a meia-noite. */
function paraMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = hora.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function paraHora(minutos: number): string {
  const norm = ((Math.round(minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}

/** Pausas com horário esperado ganham destaque; o resto fica em tom neutro. */
function ehPausaChave(reasonCode: string): boolean {
  const r = reasonCode.trim().toLowerCase();
  return r === "pausa 10" || r === "pausa 20";
}

/**
 * Linha do tempo do dia do operador: login à esquerda, cada pausa posicionada
 * pelo horário real e dimensionada pela duração.
 *
 * Só renderiza quando há horário na base — sem `hora` os eventos não têm onde
 * ser posicionados e a régua não significaria nada.
 */
export function TimelineDia({ operador }: TimelineDiaProps) {
  const eventosComHora = operador.eventos.filter((e) => e.hora !== null);
  const loginMin = paraMinutos(operador.horaLogin);

  if (eventosComHora.length === 0 && loginMin === null) {
    return (
      <p className="ds-small text-muted-foreground p-6 text-center text-xs">
        Sem horários registrados para este operador no dia.
      </p>
    );
  }

  // Domínio da régua: do login (ou do 1º evento) ao fim do último evento,
  // arredondado para a hora cheia dos dois lados.
  const inicios = eventosComHora.map((e) => paraMinutos(e.hora)!);
  const fins = eventosComHora.map((e, i) => inicios[i] + e.duracaoSeg / 60);

  const candidatosInicio = loginMin !== null ? [loginMin, ...inicios] : inicios;
  const candidatosFim = loginMin !== null ? [loginMin, ...fins] : fins;

  const inicioBruto = Math.min(...candidatosInicio);
  const fimBruto = Math.max(...candidatosFim);

  const inicio = Math.floor(inicioBruto / 60) * 60;
  const fim = Math.ceil(fimBruto / 60) * 60;
  const span = Math.max(60, fim - inicio);

  const marcasHora: number[] = [];
  for (let m = inicio; m <= fim; m += 60) marcasHora.push(m);

  const posicao = (minutos: number) => ((minutos - inicio) / span) * 100;

  return (
    <div className="space-y-2 px-4 py-5">
      {/* Régua de horas */}
      <div className="relative h-4">
        {marcasHora.map((m) => (
          <span
            key={m}
            className="text-muted-foreground absolute -translate-x-1/2 font-mono text-[10px] tabular-nums"
            style={{ left: `${posicao(m)}%` }}
          >
            {paraHora(m)}
          </span>
        ))}
      </div>

      {/* Trilha */}
      <div className="border-border/40 bg-muted/20 relative h-9 rounded-md border">
        {/* Linhas verticais das horas cheias */}
        {marcasHora.map((m) => (
          <span
            key={m}
            aria-hidden="true"
            className="bg-border/40 absolute top-0 bottom-0 w-px"
            style={{ left: `${posicao(m)}%` }}
          />
        ))}

        {/* Marca do login */}
        {loginMin !== null && (
          <span
            title={`Login às ${operador.horaLogin}`}
            className="bg-primary absolute top-0 bottom-0 w-[2px] rounded-full"
            style={{ left: `${posicao(loginMin)}%` }}
          />
        )}

        {/* Blocos de pausa */}
        {eventosComHora.map((e, i) => {
          const inicioEvento = inicios[i];
          const larguraPct = Math.max((e.duracaoSeg / 60 / span) * 100, 0.6);
          const chave = ehPausaChave(e.reasonCode);

          return (
            <span
              key={`${e.reasonCode}-${e.hora}-${i}`}
              title={`${e.reasonCode} · ${e.hora} · ${Math.round(e.duracaoSeg / 60)} min`}
              className={`absolute top-1.5 bottom-1.5 rounded-sm ${
                chave
                  ? "bg-primary/70 border-primary/80 border"
                  : e.contaIndisp
                    ? "bg-muted-foreground/40"
                    : "bg-muted-foreground/20"
              }`}
              style={{
                left: `${posicao(inicioEvento)}%`,
                width: `${larguraPct}%`,
              }}
            />
          );
        })}
      </div>

      {/* Legenda */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary inline-block h-3 w-[2px] rounded-full" aria-hidden="true" />
          Login
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="bg-primary/70 border-primary/80 inline-block size-2.5 rounded-sm border"
            aria-hidden="true"
          />
          Pausa 10 / Pausa 20
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted-foreground/40 inline-block size-2.5 rounded-sm" aria-hidden="true" />
          Outras pausas (contam indisp.)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted-foreground/20 inline-block size-2.5 rounded-sm" aria-hidden="true" />
          Não contam
        </span>
      </div>
    </div>
  );
}
