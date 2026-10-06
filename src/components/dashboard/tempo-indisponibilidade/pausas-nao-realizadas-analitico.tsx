"use client";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import {
  buildForecastPorOperador,
  formatarHoraCurta,
} from "@/lib/d1-db/calcular-aderencia";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { cn } from "@/lib/utils";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import {
  CARD_CLASS,
  gridColunas,
  HEADER_CELL_CLASS,
  HEADER_ROW_CLASS,
  LINHA_CLASS,
  NOME_CELL_CLASS,
  ROLAGEM_CLASS,
  VALOR_CELL_CLASS,
} from "./tabela-analitico";

/**
 * Previsto x real — MESMO mapeamento de calcularAderenciaOperador: 1ª Pausa
 * 10 = descanso1 x pausa10PrimeiraHora; Pausa 20 = pausa20 x pausa20Hora;
 * 2ª Pausa 10 = descanso2 x pausa10SegundaHora.
 */
const PAUSAS: { label: string; previstoKey: "descanso1" | "pausa20" | "descanso2"; realKey: "pausa10PrimeiraHora" | "pausa20Hora" | "pausa10SegundaHora" }[] = [
  { label: "1ª Pausa 10", previstoKey: "descanso1", realKey: "pausa10PrimeiraHora" },
  { label: "Pausa 20", previstoKey: "pausa20", realKey: "pausa20Hora" },
  { label: "2ª Pausa 10", previstoKey: "descanso2", realKey: "pausa10SegundaHora" },
];

// Piso único: maior título ("1ª PAUSA 10") / maior valor ("Não realizada").
const GRID_COLS = gridColunas(PAUSAS.length, 168);

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
  forecastPorOperador: ReturnType<typeof buildForecastPorOperador>;
}

/**
 * "Pausas NR17 não tiradas" — uma linha por operador que LOGOU e tem pelo
 * menos uma das 3 pausas sem horário real, MAS com horário previsto
 * cadastrado (sem previsto não dá pra saber se era pra ter acontecido).
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

  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Pausas NR17 não tiradas</h3>
        <p className="ds-small text-muted-foreground mt-1">
          {linhas.length > 0
            ? `${linhas.length} de ${logados.length} operadores que logaram hoje têm pelo menos uma pausa obrigatória não realizada. `
            : ""}
          Operadores sem login no dia não entram nesta lista.
        </p>
      </div>

      {linhas.length === 0 ? (
        <GraficoVazio
          titulo="Todas as pausas foram tiradas"
          descricao="Nenhum operador que logou hoje deixou de tirar uma pausa obrigatória."
        />
      ) : (
        <div className={ROLAGEM_CLASS}>
          <div className="min-w-fit">
            <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div data-tabela-sticky-header className={cn(HEADER_CELL_CLASS, "sticky left-0 z-10")}>
                Operador
              </div>
              {PAUSAS.map((p) => (
                <div key={p.label} className={HEADER_CELL_CLASS}>
                  {p.label}
                </div>
              ))}
            </div>

            {linhas.map(({ op, status }, idx) => (
              <div
                key={op.email}
                className={cn(LINHA_CLASS, idx < linhas.length - 1 && "border-b border-border/30")}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div data-tabela-sticky-nome className={cn(NOME_CELL_CLASS, "sticky left-0 z-10")}>
                  {formatNomeDotSobrenome(op.email)}
                </div>
                {status.map((s, i) =>
                  !s.aplica ? (
                    <div key={i} className={cn(VALOR_CELL_CLASS, "text-muted-foreground")}>
                      —
                    </div>
                  ) : s.naoRealizada ? (
                    <div key={i} className={VALOR_CELL_CLASS} style={{ color: "var(--danger)" }}>
                      Não realizada
                    </div>
                  ) : (
                    <div key={i} className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>
                      {formatarHoraCurta(s.real) ?? "—"}
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
