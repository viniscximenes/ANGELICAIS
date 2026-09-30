"use client";

import { TABELA_HEADER_BORDA } from "@/components/gestor/tabela-padrao";
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
// Maior título ("ESTOURO PAUSA 10"/"ESTOURO PAUSA 20"). 150 → 170: títulos
// agora com px-4 (32px) e o tamanho do cabeçalho de "Desempenho por marca e
// unidade" (~135px + 32), pra não serem cortados com reticências.
const DATA_COL_PISO_PX = 170;

const COLUNAS = ["Pausa 10", "Estouro Pausa 10", "Pausa 20", "Estouro Pausa 20"];

const GRID_COLS = [`minmax(${PISO_OPERADOR_PX}px, 1.6fr)`, ...COLUNAS.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`)].join(
  " ",
);

export const ESTOURO_PAUSA_MIN_WIDTH_PX = PISO_OPERADOR_PX + COLUNAS.length * DATA_COL_PISO_PX;

/**
 * Visual = "Desempenho por marca e unidade" (tabela-segmentos.tsx,
 * consolidado) — mesmas classes de aderencia-analitico.tsx e
 * pausas-detalhadas-analitico.tsx. Cor do cabeçalho por tema e fundo opaco da
 * coluna sticky Operador (sem destaque próprio) em reports-tempo-indisp.css.
 */
const HEADER_ROW_CLASS = "ds-body grid gap-0 bg-muted/40 font-bold tracking-wide uppercase";
const HEADER_CELL_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2.5 text-center";
const NOME_CELL_CLASS = "min-w-0 truncate whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-foreground";
const VALOR_CELL_CLASS = "min-w-0 whitespace-nowrap px-4 py-3 text-center text-xs font-medium";

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
}

/**
 * Card "Estouro de NR17" — uma linha por operador com estouro (Pausa 10
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
          <h3 className="ds-h3 font-semibold text-foreground">Estouro de NR17</h3>
          <p className="ds-small text-muted-foreground mt-1">
            Regra: tempo total acima de 20:00 na Pausa 10 ou na Pausa 20, sem tolerância. {linhas.length}{" "}
            de {comDados} operadores com dados estouraram alguma das duas hoje.
          </p>
        </div>
      </div>

      {/* Sem container visual — mesmo padrão atual das tabelas analíticas do Consolidado. */}
      <div className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-tema">
            <div data-estouro-pausa-tabela className="min-w-fit">
              <div
                className={HEADER_ROW_CLASS}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                <div data-tabela-sticky-header className={cn(HEADER_CELL_CLASS, "sticky left-0 z-10")}>
                  Operador
                </div>
                {COLUNAS.map((c) => (
                  <div key={c} className={HEADER_CELL_CLASS}>
                    {c}
                  </div>
                ))}
              </div>

              {linhas.map(({ op, estouroP10, estouroP20 }, idx) => {
                const isLast = idx === linhas.length - 1;
                return (
                  <div
                    key={op.email}
                    className={cn("grid items-center gap-0", !isLast && "border-b border-border/30")}
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div
                      data-tabela-sticky-nome
                      className={cn(NOME_CELL_CLASS, "sticky left-0 z-10")}
                    >
                      {formatNomeDotSobrenome(op.email)}
                    </div>
                    <div className={cn(VALOR_CELL_CLASS, "text-foreground")} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.pausas.pausa10}
                    </div>
                    <div
                      className={cn(VALOR_CELL_CLASS, estouroP10 <= 0 && "text-muted-foreground")}
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: estouroP10 > 0 ? "var(--danger)" : undefined,
                      }}
                    >
                      {estouroP10 > 0 ? formatMaisMinSeg(estouroP10) : "—"}
                    </div>
                    <div className={cn(VALOR_CELL_CLASS, "text-foreground")} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.pausas.pausa20}
                    </div>
                    <div
                      className={cn(VALOR_CELL_CLASS, estouroP20 <= 0 && "text-muted-foreground")}
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
    </div>
  );
}
