"use client";

import { useMemo } from "react";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
} from "@/lib/d1-db/calcular-aderencia";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
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
  STICKY_HEADER_CELL_CLASS,
  STICKY_NOME_CELL_CLASS,
  VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-analitico";

const COLUNAS_HORARIO: { key: 0 | 1 | 2 | 3; sufixo: "Prev." | "Real" }[] = [
  { key: 0, sufixo: "Prev." },
  { key: 0, sufixo: "Real" },
  { key: 1, sufixo: "Prev." },
  { key: 1, sufixo: "Real" },
  { key: 2, sufixo: "Prev." },
  { key: 2, sufixo: "Real" },
  { key: 3, sufixo: "Prev." },
  { key: 3, sufixo: "Real" },
];

/** "Pausa 10" nas duas pausas de 10 min — a ordem das colunas já diferencia. */
const LABELS_ITEM: Record<0 | 1 | 2 | 3, string> = {
  0: "Login",
  1: "Pausa 10",
  2: "Pausa 20",
  3: "Pausa 10",
};

/** Colunas cuja célula "Real" recebe cor semântica (dentro/fora da tolerância) — Login fica sem cor. */
const COLUNAS_COM_COR: Set<0 | 1 | 2 | 3> = new Set([1, 2, 3]);

// Piso único das colunas de dado: maior título ("PAUSA 10 PREV.", ~115px) + px-4, com folga.
const GRID_COLS = gridColunas(COLUNAS_HORARIO.length, 150);

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
  /** Mesmo Map já construído em TempoIndispSection (buildForecastPorOperador). */
  forecastPorOperador: ReturnType<typeof buildForecastPorOperador>;
  /**
   * Tolerância em minutos, para mais e para menos — a MESMA
   * config_aderencia.toleranciaMin do OperadorAnaliticoDialog, pra card e
   * dialog nunca darem veredito diferente pro mesmo horário. Antes era fixa
   * em 10 aqui (o valor da config hoje, pra todos os gestores).
   */
  toleranciaMin: number;
}

/**
 * "Aderência de login e pausas" — uma linha por operador com horário
 * previsto cadastrado, comparando previsto x real de Login e das 3 pausas
 * (calcularAderenciaOperador, a mesma do dialog). A aderência de cada pausa
 * aparece só na cor do valor "Real" (verde dentro, vermelho fora).
 */
export function AderenciaAnalitico({ operadores, forecastPorOperador, toleranciaMin }: Props) {
  // Memoizado: a seção re-renderiza por estado que não muda estes dados
  // (popover, dialog, olho...) — `operadores` e `forecastPorOperador` chegam
  // com referência estável (useMemo em TempoIndispSection).
  const linhas = useMemo(
    () =>
      operadores
        .map((op) => {
          const aderencia = calcularAderenciaOperador(
            op.email,
            {
              login: op.horaLogin,
              pausa10Primeira: op.pausa10PrimeiraHora,
              pausa20: op.pausa20Hora,
              pausa10Segunda: op.pausa10SegundaHora,
            },
            forecastPorOperador,
            toleranciaMin,
          );
          return { op, aderencia };
        })
        .filter(({ aderencia }) => aderencia.forecast !== null),
    [operadores, forecastPorOperador, toleranciaMin],
  );

  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Aderência de login e pausas</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Aderência avaliada com tolerância de {toleranciaMin} minutos para mais ou para menos em cada horário (login e pausas).
        </p>
      </div>

      {linhas.length === 0 ? (
        <GraficoVazio
          titulo="Sem horários programados"
          descricao="Nenhum operador da equipe tem horários de login e pausas programados."
        />
      ) : (
        <div className={ROLAGEM_CLASS}>
          {/* Semântica de tabela via ARIA (role=table/row/columnheader/
              rowheader/cell) nos mesmos <div> do grid — mesmo padrão da
              tabela principal (TempoIndispTabela) e da EquipeTable do
              Consolidado. */}
          <div role="table" aria-label="Aderência de login e pausas por operador" className="min-w-fit">
            <div role="row" className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div role="columnheader" className={cn(HEADER_CELL_CLASS, STICKY_HEADER_CELL_CLASS)}>
                Operador
              </div>
              {COLUNAS_HORARIO.map((col, i) => (
                <div key={i} role="columnheader" className={HEADER_CELL_CLASS}>
                  {LABELS_ITEM[col.key]} {col.sufixo}
                </div>
              ))}
            </div>

            {linhas.map(({ op, aderencia }, idx) => (
              <div
                key={op.email}
                role="row"
                className={cn(LINHA_CLASS, idx < linhas.length - 1 && "border-b border-border/30")}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div role="rowheader" className={cn(NOME_CELL_CLASS, STICKY_NOME_CELL_CLASS)}>
                  {formatNomeDotSobrenome(op.email)}
                </div>
                {COLUNAS_HORARIO.map((col, i) => {
                  const item = aderencia.items[col.key];
                  const val = col.sufixo === "Prev." ? item.horaForecast : item.horaReal;
                  const isEmpty = !val;
                  // Cor semântica SÓ na célula "Real" das 3 pausas (mesmo
                  // token/peso do valor-veredito da tabela principal).
                  const aplicaCor = col.sufixo === "Real" && COLUNAS_COM_COR.has(col.key);
                  const cor =
                    !aplicaCor || isEmpty || item.dentroTolerancia === null
                      ? undefined
                      : item.dentroTolerancia
                        ? "var(--success)"
                        : "var(--danger)";
                  return (
                    <div role="cell"
                      key={i}
                      className={cn(
                        VALOR_CELL_CLASS,
                        "tabular-nums",
                        cor ? undefined : isEmpty ? "text-muted-foreground" : "text-foreground",
                      )}
                      style={{ color: cor, fontWeight: cor ? 600 : undefined }}
                    >
                      {val ?? "—"}
                      {/* O veredito não fica só na cor: texto para leitor
                          de tela (a tela segue só com verde/vermelho). */}
                      {cor && (
                        <span className="sr-only">
                          {item.dentroTolerancia ? " (dentro da tolerância)" : " (fora da tolerância)"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
