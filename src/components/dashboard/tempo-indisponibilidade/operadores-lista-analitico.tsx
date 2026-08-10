"use client";

import { useMemo, useState } from "react";
import { IconUsers } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
  type HorasReaisAderencia,
} from "@/lib/d1-db/calcular-aderencia";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { OperadorAnaliticoDialog } from "./operador-analitico-dialog";

const GRID_COLS = "2.2fr 1.6fr 1.4fr 1.3fr 1.5fr";

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatLogin(horaLogin: string | null): string {
  return horaLogin ?? "—";
}

function formatLogout(
  status: OperadorAnaliticoTempoIndisp["statusTL"],
  horaLogout: string | null,
): string {
  if (status === "ainda_logado") return "Ainda logado";
  if (status === "ausente") return "—";
  return horaLogout ?? "—";
}

function horasReaisDe(op: OperadorAnaliticoTempoIndisp): HorasReaisAderencia {
  return {
    login: op.horaLogin,
    pausa10Primeira: op.pausa10PrimeiraHora,
    pausa20: op.pausa20Hora,
    pausa10Segunda: op.pausa10SegundaHora,
  };
}

interface OperadoresListaAnaliticoProps {
  operadores: OperadorAnaliticoTempoIndisp[];
  pausasProgramadas: PausaProgramadaDb[];
  toleranciaMin: number;
}

export function OperadoresListaAnalitico({
  operadores,
  pausasProgramadas,
  toleranciaMin,
}: OperadoresListaAnaliticoProps) {
  const [selecionado, setSelecionado] = useState<OperadorAnaliticoTempoIndisp | null>(null);
  const [open, setOpen] = useState(false);

  const forecastPorOperador = useMemo(
    () => buildForecastPorOperador(pausasProgramadas),
    [pausasProgramadas],
  );

  const operadoresComDados = operadores.filter(
    (op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null,
  );

  function abrir(op: OperadorAnaliticoTempoIndisp) {
    setSelecionado(op);
    setOpen(true);
  }

  const aderenciaSelecionado = selecionado
    ? calcularAderenciaOperador(
        selecionado.email,
        horasReaisDe(selecionado),
        forecastPorOperador,
        toleranciaMin,
      )
    : { forecast: null, items: [], percentualTotal: null };

  return (
    <div className="space-y-3">
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconUsers size={20} className="text-foreground" />
          Operadores
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Clique no operador para ver o detalhamento das pausas individuais e aderencias.
        </p>
      </div>

      {/* ── Card em StyledCard com cantos azuis e fundo escurecido ──── */}
      <StyledCard className="p-0 overflow-hidden" withGradient>
        {operadoresComDados.length === 0 ? (
          <p className="ds-small text-muted-foreground p-6 text-center">
            Nenhum operador com dados no período.
          </p>
        ) : (
          <>
            <div
              className="ds-mono-sm text-muted-foreground grid gap-0 font-semibold tracking-wider uppercase bg-muted/40"
              style={{
                gridTemplateColumns: GRID_COLS,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div className="px-4 py-2 text-left">Operador</div>
              <div className="px-2 py-2 text-center">Tempo Logado</div>
              <div className="px-2 py-2 text-center">Indisp. %</div>
              <div className="px-2 py-2 text-center">Login</div>
              <div className="px-4 py-2 text-center">Logout</div>
            </div>

            <ul className="divide-border/30 divide-y">
              {operadoresComDados.map((op) => {
                const nome = formatNomeDotSobrenome(op.email);
                const belowMetaTL = op.statusTL === "completo" && !op.cumpriuMetaTL;
                const acimaMetaIndisp =
                  op.indisponibilidade !== null && !op.cumpriuMetaIndisp;

                return (
                  <li key={op.email}>
                    <button
                      type="button"
                      onClick={() => abrir(op)}
                      className="hover:bg-muted/40 grid w-full items-center gap-0 text-left transition-colors"
                      style={{ gridTemplateColumns: GRID_COLS }}
                    >
                      <span className="ds-small flex min-w-0 items-center gap-1.5 px-4 py-2.5 text-left text-foreground font-medium">
                        <span className="truncate">{nome}</span>
                      </span>

                      <span
                        className={`ds-mono-sm px-2 py-2.5 text-center tabular-nums font-semibold ${
                          belowMetaTL ? "text-danger" : "text-foreground"
                        }`}
                      >
                        {op.tempoLogado || "—"}
                      </span>

                      <span
                        className={`ds-mono-sm px-2 py-2.5 text-center tabular-nums font-semibold ${
                          acimaMetaIndisp ? "text-danger" : "text-foreground"
                        }`}
                      >
                        {fmtPct(op.indisponibilidade)}
                      </span>

                      <span className="ds-mono-sm text-muted-foreground px-2 py-2.5 text-center tabular-nums">
                        {formatLogin(op.horaLogin)}
                      </span>

                      <span className="ds-mono-sm text-muted-foreground px-4 py-2.5 text-center tabular-nums">
                        {formatLogout(op.statusTL, op.horaLogout)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </StyledCard>

      <OperadorAnaliticoDialog
        operador={selecionado}
        nomeExibido={selecionado ? formatNomeDotSobrenome(selecionado.email) : ""}
        aderencia={aderenciaSelecionado}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
