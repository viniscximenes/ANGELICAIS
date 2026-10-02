"use client";

import { useMemo } from "react";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { EquipeTable } from "@/components/d-1/equipe-table";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";

interface TabelaOperadoresQ4Props {
  operadores: OperadorIndividual[];
  /** Meta de tx (0-100) para colorir a coluna Tx Retenção. */
  meta: number;
  /** Clique na linha do operador (abre o card individual) — recebe o login. */
  onOperadorClick?: (login: string) => void;
}

/**
 * Operadores em Q4 de um supervisor — MESMA tabela de
 * TabelaOperadoresComparativo (/s/operacao/comparativo), que por sua vez é a
 * tabela principal de /s/reports/consolidado (EquipeTable dentro do
 * KpiFrame com as cantoneiras).
 *
 * Sem a linha de totais (EQUIPE): a lista é só um recorte da equipe (os
 * operadores em Q4), então um total aqui não seria o da equipe.
 *
 * Usa o identificador REAL do operador (`login`), nunca nome fantasia —
 * mesma regra do comparativo. A EquipeTable já exibe só a parte antes do "@".
 */
export function TabelaOperadoresQ4({ operadores, meta, onOperadorClick }: TabelaOperadoresQ4Props) {
  // TX desc (melhor → pior), mesma ordem da tabela do comparativo.
  const linhas = useMemo<OperadorConsolidado[]>(() => {
    return [...operadores]
      .sort((a, b) => {
        if (a.tx === null && b.tx === null) return a.login.localeCompare(b.login);
        if (a.tx === null) return 1;
        if (b.tx === null) return -1;
        return b.tx - a.tx;
      })
      .map((op) => ({
        email: op.login,
        emailOriginal: op.login,
        supervisor: "",
        retidos: op.retidos,
        cancelados: op.cancelados,
        pedidos: op.total,
        txRetencao: op.tx,
      }));
  }, [operadores]);

  const equipe: ResumoEquipe = {
    retidos: 0,
    cancelados: 0,
    pedidos: 0,
    txRetencao: null,
    horaReport: "—",
  };

  if (linhas.length === 0) {
    return (
      <p className="py-6 px-4 text-center ds-small text-muted-foreground">
        Nenhum operador deste supervisor está em Q4 da empresa.
      </p>
    );
  }

  // Largura total: a coluna Operador estica pra ocupar o espaço que sobra
  // (grid-template-columns sobrescrito no CSS da página, via
  // data-operadores-quartil — a EquipeTable usa larguras fixas inline).
  return (
    <div data-operadores-quartil className="w-full overflow-x-auto scrollbar-tema">
      <KpiFrame>
        <EquipeTable
          operadores={linhas}
          equipe={equipe}
          metaTx={meta / 100}
          hideTotais
          onOperadorClick={onOperadorClick}
        />
      </KpiFrame>
    </div>
  );
}
