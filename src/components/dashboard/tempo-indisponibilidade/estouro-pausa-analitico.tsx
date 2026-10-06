"use client";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { horaParaSegundos } from "@/lib/d1-db/parse";
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

/**
 * Regra DECIDIDA (não reabrir): estouro = tempo total da Pausa 10 (coluna
 * única, já soma o dia inteiro) OU da Pausa 20 acima de 20:00, SEM
 * tolerância — qualquer segundo acima conta.
 */
const LIMITE_SEGUNDOS = 20 * 60;

/**
 * MM:SS com sufixo de unidade — "s" quando o estouro é menor que 1 minuto
 * ("+00:05s"), "m" a partir de 1 minuto ("+05:30m").
 */
function formatMaisMinSeg(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  const sufixo = segundos < 60 ? "s" : "m";
  return `+${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}${sufixo}`;
}

const COLUNAS = ["Pausa 10", "Estouro Pausa 10", "Pausa 20", "Estouro Pausa 20"];

// Piso único: maior título ("ESTOURO PAUSA 10", ~135px) + px-4.
const GRID_COLS = gridColunas(COLUNAS.length, 170);

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
}

/** "Estouro de NR17" — uma linha por operador com estouro, do maior pro menor. */
export function EstouroPausaAnalitico({ operadores }: Props) {
  const linhas = operadores
    .map((op) => {
      const estouroP10 = Math.max(0, horaParaSegundos(op.pausas.pausa10) - LIMITE_SEGUNDOS);
      const estouroP20 = Math.max(0, horaParaSegundos(op.pausas.pausa20) - LIMITE_SEGUNDOS);
      return { op, estouroP10, estouroP20, estouroTotal: estouroP10 + estouroP20 };
    })
    .filter((l) => l.estouroP10 > 0 || l.estouroP20 > 0)
    .sort((a, b) => {
      if (b.estouroTotal !== a.estouroTotal) return b.estouroTotal - a.estouroTotal;
      return formatNomeDotSobrenome(a.op.email).localeCompare(formatNomeDotSobrenome(b.op.email));
    });

  const comDados = operadores.filter((op) => op.indisponibilidade !== null).length;

  function celulaEstouro(segundos: number) {
    return (
      <div
        className={cn(VALOR_CELL_CLASS, "tabular-nums", segundos <= 0 && "text-muted-foreground")}
        style={{ color: segundos > 0 ? "var(--danger)" : undefined }}
      >
        {segundos > 0 ? formatMaisMinSeg(segundos) : "—"}
      </div>
    );
  }

  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Estouro de NR17</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Regra: tempo total acima de 20:00 na Pausa 10 ou na Pausa 20, sem tolerância.
          {linhas.length > 0 && ` ${linhas.length} de ${comDados} operadores com dados estouraram alguma das duas hoje.`}
        </p>
      </div>

      {linhas.length === 0 ? (
        <GraficoVazio
          titulo="Nenhum estouro hoje"
          descricao="Nenhum operador passou de 20:00 na Pausa 10 ou na Pausa 20."
        />
      ) : (
        <div className={ROLAGEM_CLASS}>
          <div className="min-w-fit">
            <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div className={cn(HEADER_CELL_CLASS, STICKY_HEADER_CELL_CLASS)}>
                Operador
              </div>
              {COLUNAS.map((c) => (
                <div key={c} className={HEADER_CELL_CLASS}>
                  {c}
                </div>
              ))}
            </div>

            {linhas.map(({ op, estouroP10, estouroP20 }, idx) => (
              <div
                key={op.email}
                className={cn(LINHA_CLASS, idx < linhas.length - 1 && "border-b border-border/30")}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className={cn(NOME_CELL_CLASS, STICKY_NOME_CELL_CLASS)}>
                  {formatNomeDotSobrenome(op.email)}
                </div>
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>{op.pausas.pausa10}</div>
                {celulaEstouro(estouroP10)}
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>{op.pausas.pausa20}</div>
                {celulaEstouro(estouroP20)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
