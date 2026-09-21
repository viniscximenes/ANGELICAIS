"use client";

import { IconCalendarX } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import {
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";
import {
  buildForecastPorOperador,
  formatarHoraCurta,
} from "@/lib/d1-db/calcular-aderencia";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { cn } from "@/lib/utils";

import { PISO_OPERADOR_PX_COMPARTILHADO } from "./aderencia-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

/**
 * Mapeamento previsto x real — MESMO de calcularAderenciaOperador
 * (calcular-aderencia.ts): 1ª Pausa 10 = forecast.descanso1 x
 * op.pausa10PrimeiraHora; Pausa 20 = forecast.pausa20 x op.pausa20Hora;
 * 2ª Pausa 10 = forecast.descanso2 x op.pausa10SegundaHora. Mesma ordem
 * de apresentação da Aderência (1ª P10, P20, 2ª P10).
 */
const PAUSAS: { label: string; previstoKey: "descanso1" | "pausa20" | "descanso2"; realKey: "pausa10PrimeiraHora" | "pausa20Hora" | "pausa10SegundaHora" }[] = [
  { label: "1ª Pausa 10", previstoKey: "descanso1", realKey: "pausa10PrimeiraHora" },
  { label: "Pausa 20", previstoKey: "pausa20", realKey: "pausa20Hora" },
  { label: "2ª Pausa 10", previstoKey: "descanso2", realKey: "pausa10SegundaHora" },
];

const NAO_REALIZADA_LABEL = "Não realizada";

/**
 * Pisos de largura — medidos via Puppeteer (mesma metodologia das tabelas
 * irmãs): maior título ("1ª Pausa 10", "2ª Pausa 10") e maior valor
 * possível ("Não realizada") na célula.
 */
const PISO_OPERADOR_PX = PISO_OPERADOR_PX_COMPARTILHADO;
const DATA_COL_PISO_PX = 168;

const GRID_COLS = [`minmax(${PISO_OPERADOR_PX}px, 1.6fr)`, ...PAUSAS.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`)].join(
  " ",
);

export const PAUSAS_NAO_REALIZADAS_MIN_WIDTH_PX = PISO_OPERADOR_PX + PAUSAS.length * DATA_COL_PISO_PX;

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
  forecastPorOperador: ReturnType<typeof buildForecastPorOperador>;
}

/**
 * Card "Pausas obrigatórias não realizadas" — uma linha por operador que
 * LOGOU (horaLogin preenchida) e tem pelo menos uma das 3 pausas
 * (1ª P10, P20, 2ª P10) sem horário real registrado, MAS com horário
 * previsto cadastrado em base_pausas_programadas (senão não dá pra saber
 * se era pra ter acontecido — mesma regra "sem previsto = —" da Aderência).
 *
 * Não recalcula nada novo: só reaproveita o mesmo forecastPorOperador
 * (buildForecastPorOperador) já usado pela Aderência.
 */
export function PausasNaoRealizadasAnalitico({ operadores, forecastPorOperador }: Props) {
  const logados = operadores.filter((op) => !!op.horaLogin);

  const linhas = logados
    .map((op) => {
      const forecast = forecastPorOperador.get(getEmailPrefix(op.email)) ?? null;
      const status = PAUSAS.map(({ previstoKey, realKey }) => {
        const previsto = forecast ? forecast[previstoKey] : null;
        const real = op[realKey];
        if (!previsto) return { aplica: false as const, real: null };
        return { aplica: true as const, naoRealizada: !real, real };
      });
      const qtdNaoRealizadas = status.filter((s) => s.aplica && s.naoRealizada).length;
      return { op, status, qtdNaoRealizadas };
    })
    .filter((l) => l.qtdNaoRealizadas > 0)
    .sort((a, b) => {
      if (b.qtdNaoRealizadas !== a.qtdNaoRealizadas) return b.qtdNaoRealizadas - a.qtdNaoRealizadas;
      return formatNomeDotSobrenome(a.op.email).localeCompare(formatNomeDotSobrenome(b.op.email));
    });

  if (linhas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconCalendarX size={20} className="text-foreground" />
            Pausas obrigatórias não realizadas
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            {linhas.length} de {logados.length} operadores que logaram hoje têm pelo menos uma pausa
            obrigatória não realizada. Operadores sem login no dia não entram nesta lista.
          </p>
        </div>
      </div>

      <StyledCard className="p-3" withGradient>
        <div className={TABELA_CONTAINER_CLASS}>
          <div className="overflow-x-auto scrollbar-tema">
            <div data-pausas-nao-realizadas-tabela className="min-w-fit">
              <div
                className={TABELA_HEADER_CLASS}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                <div className={cn(TABELA_HEADER_CELL_CLASS, "sticky left-0 z-10")}>Operador</div>
                {PAUSAS.map((p, i) => (
                  <div
                    key={p.label}
                    className={i === PAUSAS.length - 1 ? TABELA_HEADER_CELL_ULTIMA_CLASS : TABELA_HEADER_CELL_CLASS}
                  >
                    {p.label}
                  </div>
                ))}
              </div>

              {linhas.map(({ op, status }, idx) => {
                const isLast = idx === linhas.length - 1;
                return (
                  <div
                    key={op.email}
                    className={TABELA_LINHA_CLASS}
                    style={{
                      gridTemplateColumns: GRID_COLS,
                      borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                    }}
                  >
                    <div
                      className={cn(TABELA_NOME_CELL_CLASS, "sticky left-0 z-10")}
                      style={{ background: "var(--card)" }}
                    >
                      {formatNomeDotSobrenome(op.email)}
                    </div>
                    {status.map((s, i) => {
                      if (!s.aplica) {
                        return (
                          <div key={i} className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground")}>
                            —
                          </div>
                        );
                      }
                      if (s.naoRealizada) {
                        return (
                          <div
                            key={i}
                            className={cn(TABELA_VALOR_CELL_CLASS, "font-medium")}
                            style={{ color: "var(--danger)" }}
                          >
                            {NAO_REALIZADA_LABEL}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={i}
                          className={cn(TABELA_VALOR_CELL_CLASS, "text-foreground")}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatarHoraCurta(s.real) ?? "—"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </StyledCard>
    </div>
  );
}
