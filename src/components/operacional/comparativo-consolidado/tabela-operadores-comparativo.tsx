"use client";

import { useMemo } from "react";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { EquipeTable } from "@/components/d-1/equipe-table";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";

interface TabelaOperadoresComparativoProps {
  operadores: OperadorIndividual[];
  /** Meta de tx (0-100) para colorir a coluna Tx Retenção. */
  meta: number;
  /** Totais do gestor (linha EQUIPE da tabela). */
  totais: { retidos: number; cancelados: number; pedidos: number; tx: number | null };
  /** Clique na linha do operador (abre o card individual) — recebe o login. */
  onOperadorClick?: (login: string) => void;
}

/**
 * Tabela de operadores de um gestor no comparativo — renderiza a MESMA
 * tabela principal da equipe de /s/reports/consolidado (EquipeTable dentro
 * do KpiFrame com as cantoneiras), pra ficar idêntica a ela.
 *
 * Usa o identificador REAL do operador (`login`, o email canônico do roster),
 * nunca operador_nome_fantasia — o comparativo entre pares mostra o operador
 * como ele é no banco. A EquipeTable já exibe só a parte antes do "@".
 */
export function TabelaOperadoresComparativo({
  operadores,
  meta,
  totais,
  onOperadorClick,
}: TabelaOperadoresComparativoProps) {
  // TX desc (melhor → pior); quem não teve atendimento fica no fim — mesma
  // regra de get-por-operador-individual, replicada aqui por segurança caso a
  // lista chegue reordenada.
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
    retidos: totais.retidos,
    cancelados: totais.cancelados,
    pedidos: totais.pedidos,
    txRetencao: totais.tx,
    horaReport: "—",
  };

  if (linhas.length === 0) {
    return (
      <p className="py-6 px-4 text-center ds-small text-muted-foreground">
        Nenhum operador cadastrado para este gestor.
      </p>
    );
  }

  // Largura total: a coluna Operador estica pra ocupar o espaço que sobra
  // (grid-template-columns sobrescrito no CSS da página, via
  // data-operadores-comparativo — a EquipeTable usa larguras fixas inline).
  return (
    <div data-operadores-comparativo className="w-full overflow-x-auto scrollbar-tema">
      <KpiFrame>
        <EquipeTable
          operadores={linhas}
          equipe={equipe}
          metaTx={meta / 100}
          onOperadorClick={onOperadorClick}
        />
      </KpiFrame>
    </div>
  );
}
