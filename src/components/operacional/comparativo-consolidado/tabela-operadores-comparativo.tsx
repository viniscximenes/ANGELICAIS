"use client";

import { useMemo } from "react";
import { IconUsers } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";

interface TabelaOperadoresComparativoProps {
  operadores: OperadorIndividual[];
  /** Meta de tx (0-100) para colorir a coluna Tx Retenção. */
  meta: number;
}

/**
 * Tabela de operadores de um gestor no comparativo — mesmas colunas de
 * /reports/consolidado (Operador, Retidos, Cancelados, Pedidos, Tx Retenção).
 *
 * Usa o identificador REAL do operador (`login`, o email canônico do roster),
 * nunca operador_nome_fantasia — o comparativo entre pares mostra o operador
 * como ele é no banco.
 */
export function TabelaOperadoresComparativo({
  operadores,
  meta,
}: TabelaOperadoresComparativoProps) {
  // TX desc (melhor → pior); quem não teve atendimento fica no fim — mesma
  // regra de get-por-operador-individual, replicada aqui por segurança caso a
  // lista chegue reordenada.
  const ordenados = useMemo(() => {
    return [...operadores].sort((a, b) => {
      if (a.tx === null && b.tx === null) return a.login.localeCompare(b.login);
      if (a.tx === null) return 1;
      if (b.tx === null) return -1;
      return b.tx - a.tx;
    });
  }, [operadores]);

  const txColor = (tx: number | null) => {
    if (tx === null) return "text-muted-foreground";
    return tx < meta / 100 ? "text-danger font-medium" : "text-success font-medium";
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconUsers size={20} className="text-foreground" />
          Operadores
        </h4>
        <p className="ds-small text-muted-foreground mt-1">
          Identificador real do operador (login), sem apelido.
        </p>
      </div>

      <StyledCard className="p-0 overflow-hidden" withGradient corners="all">
        <div className="overflow-x-auto scrollbar-tema">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[11px] select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Operador</th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Retidos
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Cancelados
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Pedidos
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[130px] whitespace-nowrap">
                  Tx Retenção
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {ordenados.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 px-4 text-center ds-small text-muted-foreground"
                  >
                    Nenhum operador cadastrado para este gestor.
                  </td>
                </tr>
              ) : (
                ordenados.map((op) => {
                  const txFormatted =
                    op.tx !== null ? `${(op.tx * 100).toFixed(1)}%` : "—";
                  return (
                    <tr key={op.login} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                        {op.login}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {op.retidos.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {op.cancelados.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {op.total.toLocaleString("pt-BR")}
                      </td>
                      <td
                        className={`py-3 px-4 text-center text-xs font-semibold ${txColor(op.tx)}`}
                      >
                        {txFormatted}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </StyledCard>
    </div>
  );
}
