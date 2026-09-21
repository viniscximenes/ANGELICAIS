"use client";

import { IconClockExclamation } from "@tabler/icons-react";

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
import { horaParaSegundos } from "@/lib/d1-db/parse";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { cn } from "@/lib/utils";

import { PISO_OPERADOR_PX_COMPARTILHADO } from "./aderencia-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

/**
 * Regra DECIDIDA (não reabrir): estouro = tempo total da Pausa 10 (coluna
 * única, já soma o dia inteiro — ver pausas-detalhadas-analitico.tsx) OU da
 * Pausa 20 acima de 20:00, SEM tolerância — qualquer segundo acima conta.
 * `pausa10` é uma coluna ÚNICA do banco (não soma "1ª+2ª pausa10" no app —
 * já vem consolidada assim da fonte), então um operador com só UMA das duas
 * ocorrências de pausa10 realizada não fica de fora da regra: o total dele
 * é o que foi registrado, qualquer que seja o número de ocorrências.
 */
const LIMITE_SEGUNDOS = 20 * 60;

/**
 * Formato pedido: MM:SS com sufixo de unidade — "s" quando o estouro é
 * menor que 1 minuto (ex.: "+00:05s", "+00:59s"), "m" quando é 1 minuto ou
 * mais (ex.: "+01:00m", "+05:30m", "+12:07m"). O limiar é o total em
 * segundos (< 60 → "s"), não os minutos/segundos separados.
 */
function formatMaisMinSeg(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  const sufixo = segundos < 60 ? "s" : "m";
  return `+${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}${sufixo}`;
}

const PISO_OPERADOR_PX = PISO_OPERADOR_PX_COMPARTILHADO;
// Maior título ("ESTOURO PAUSA 10"/"ESTOURO PAUSA 20") medido via Puppeteer.
const DATA_COL_PISO_PX = 150;

const COLUNAS = ["Pausa 10", "Estouro Pausa 10", "Pausa 20", "Estouro Pausa 20"];

const GRID_COLS = [`minmax(${PISO_OPERADOR_PX}px, 1.6fr)`, ...COLUNAS.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`)].join(
  " ",
);

export const ESTOURO_PAUSA_MIN_WIDTH_PX = PISO_OPERADOR_PX + COLUNAS.length * DATA_COL_PISO_PX;

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
}

/**
 * Card "Estouro de pausa" — uma linha por operador com estouro (Pausa 10
 * e/ou Pausa 20 acima de 20:00, sem tolerância, regra fixa). Reaproveita
 * horaParaSegundos (parse.ts, já usado por get-gestor-indisponibilidade.ts)
 * pra converter as colunas "HH:MM:SS" de op.pausas.
 */
export function EstouroPausaAnalitico({ operadores }: Props) {
  const linhas = operadores
    .map((op) => {
      const segP10 = horaParaSegundos(op.pausas.pausa10);
      const segP20 = horaParaSegundos(op.pausas.pausa20);
      const estouroP10 = Math.max(0, segP10 - LIMITE_SEGUNDOS);
      const estouroP20 = Math.max(0, segP20 - LIMITE_SEGUNDOS);
      return { op, segP10, segP20, estouroP10, estouroP20, estouroTotal: estouroP10 + estouroP20 };
    })
    .filter((l) => l.estouroP10 > 0 || l.estouroP20 > 0)
    .sort((a, b) => {
      if (b.estouroTotal !== a.estouroTotal) return b.estouroTotal - a.estouroTotal;
      return formatNomeDotSobrenome(a.op.email).localeCompare(formatNomeDotSobrenome(b.op.email));
    });

  const comDados = operadores.filter((op) => op.indisponibilidade !== null).length;

  if (linhas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconClockExclamation size={20} className="text-foreground" />
            Estouro de pausa
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Regra: tempo total acima de 20:00 na Pausa 10 ou na Pausa 20, sem tolerância. {linhas.length}{" "}
            de {comDados} operadores com dados estouraram alguma das duas hoje.
          </p>
        </div>
      </div>

      <StyledCard className="p-3" withGradient>
        <div className={TABELA_CONTAINER_CLASS}>
          <div className="overflow-x-auto scrollbar-tema">
            <div data-estouro-pausa-tabela className="min-w-fit">
              <div
                className={TABELA_HEADER_CLASS}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                <div className={cn(TABELA_HEADER_CELL_CLASS, "sticky left-0 z-10")}>Operador</div>
                {COLUNAS.map((c, i) => (
                  <div
                    key={c}
                    className={i === COLUNAS.length - 1 ? TABELA_HEADER_CELL_ULTIMA_CLASS : TABELA_HEADER_CELL_CLASS}
                  >
                    {c}
                  </div>
                ))}
              </div>

              {linhas.map(({ op, estouroP10, estouroP20 }, idx) => {
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
                    <div className={cn(TABELA_VALOR_CELL_CLASS, "text-foreground")} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.pausas.pausa10}
                    </div>
                    <div
                      className={cn(TABELA_VALOR_CELL_CLASS, estouroP10 > 0 ? "font-medium" : "text-muted-foreground")}
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: estouroP10 > 0 ? "var(--danger)" : undefined,
                      }}
                    >
                      {estouroP10 > 0 ? formatMaisMinSeg(estouroP10) : "—"}
                    </div>
                    <div className={cn(TABELA_VALOR_CELL_CLASS, "text-foreground")} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.pausas.pausa20}
                    </div>
                    <div
                      className={cn(TABELA_VALOR_CELL_CLASS, estouroP20 > 0 ? "font-medium" : "text-muted-foreground")}
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: estouroP20 > 0 ? "var(--danger)" : undefined,
                      }}
                    >
                      {estouroP20 > 0 ? formatMaisMinSeg(estouroP20) : "—"}
                    </div>
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
