"use client";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import type { PausasDetalhe } from "@/lib/d1-db/types";
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

/** Colunas de dado, na ordem da tabela (Sistema é a última). */
const COLUNAS: { key: keyof PausasDetalhe; label: string }[] = [
  { key: "pausa10", label: "Pausa 10" },
  { key: "pausa20", label: "Pausa 20" },
  { key: "pausaParticular", label: "Particular" },
  { key: "monOuTaref", label: "Mon/Taref" },
  { key: "trenOuReun", label: "Tren/Reun" },
  { key: "feedback", label: "Feedback" },
  { key: "prePausa", label: "Pré Pausa" },
  { key: "ativo", label: "Ativo" },
  { key: "takeBlip", label: "Take Blip" },
  { key: "email", label: "E-mail" },
  { key: "indisponivel", label: "Indisp." },
  { key: "operacional", label: "Operacional" },
  { key: "sistema", label: "Sistema" },
];

// Piso único das colunas de dado: maior título ("OPERACIONAL", ~110px) + px-4.
const GRID_COLS = gridColunas(COLUNAS.length, 144);

function fmt(s: string): string {
  if (!s || s === "00:00:00") return "—";
  return s;
}

interface Props {
  /**
   * MESMA lista (já ordenada pela config do gestor) da tabela principal —
   * antes recebia a lista crua da indisponibilidade, na ordem do roster,
   * ignorando a ordenação escolhida.
   */
  operadores: OperadorAnaliticoTempoIndisp[];
}

/**
 * Tabela de consulta (sem hover/clique) com todas as pausas por operador.
 * Nome sempre REAL (sem nome fantasia) — regra do analítico.
 */
export function PausasDetalhadasAnalitico({ operadores }: Props) {
  const comDados = operadores.filter((op) => op.indisponibilidade !== null);

  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Tabela de pausas detalhadas</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento de todas as pausas registradas por operador no período.
        </p>
      </div>

      {comDados.length === 0 ? (
        <GraficoVazio
          titulo="Nenhuma pausa registrada hoje"
          descricao="Ainda não há pausas reportadas pra sua equipe."
          altura={280}
        />
      ) : (
        <div className={ROLAGEM_CLASS}>
          {/* Semântica de tabela via ARIA (role=table/row/columnheader/
              rowheader/cell) nos mesmos <div> do grid — mesmo padrão da
              tabela principal (TempoIndispTabela) e da EquipeTable do
              Consolidado. */}
          <div role="table" aria-label="Pausas detalhadas por operador" className="min-w-fit">
            <div role="row" className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div role="columnheader" className={cn(HEADER_CELL_CLASS, STICKY_HEADER_CELL_CLASS)}>
                Operador
              </div>
              {COLUNAS.map((col) => (
                <div key={col.key} role="columnheader" className={HEADER_CELL_CLASS}>
                  {col.label}
                </div>
              ))}
            </div>

            {comDados.map((op, idx) => (
              <div
                key={op.email}
                role="row"
                className={cn(LINHA_CLASS, idx < comDados.length - 1 && "border-b border-border/30")}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div role="rowheader" className={cn(NOME_CELL_CLASS, STICKY_NOME_CELL_CLASS)}>
                  {formatNomeDotSobrenome(op.email)}
                </div>
                {COLUNAS.map((col) => {
                  const val = fmt(op.pausas[col.key]);
                  return (
                    <div role="cell"
                      key={col.key}
                      className={cn(VALOR_CELL_CLASS, "tabular-nums", val === "—" ? "text-muted-foreground" : "text-foreground")}
                    >
                      {val}
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
