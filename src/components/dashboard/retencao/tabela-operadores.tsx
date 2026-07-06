"use client";

import { useState } from "react";
import type { OperadorItem } from "@/lib/retencao/get-por-operador";
import { IconChevronUp, IconChevronDown } from "@tabler/icons-react";

interface TabelaOperadoresProps {
  operadores: OperadorItem[];
  meta: number;
}

type SortField = "nome" | "total" | "retidos" | "cancelados" | "tx";
type SortOrder = "asc" | "desc";

export function TabelaOperadores({ operadores, meta }: TabelaOperadoresProps) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedData = [...operadores].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    if (sortField === "nome") {
      valA = a.nome.toLowerCase();
      valB = b.nome.toLowerCase();
    } else if (sortField === "tx") {
      valA = a.tx !== null ? a.tx : -1;
      valB = b.tx !== null ? b.tx : -1;
    } else {
      valA = a[sortField];
      valB = b[sortField];
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <IconChevronUp size={14} className="inline ml-1" />
    ) : (
      <IconChevronDown size={14} className="inline ml-1" />
    );
  };

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4 flex flex-col justify-between">
      <div className="space-y-1">
        <h3 className="ds-h3 font-semibold text-foreground">Desempenho por Operador</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Resultados individuais da equipe ordenáveis por volume de atendimentos e taxa de sucesso.
        </p>
      </div>

      <div className="flex-1 overflow-x-auto min-h-[220px] max-h-[360px] overflow-y-auto scrollbar-tema pr-1 border border-border/30 rounded-lg">
        {sortedData.length === 0 ? (
          <p className="ds-small text-muted-foreground text-center py-12 italic">
            Nenhum operador com registros no período.
          </p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-800/60 sticky top-0 border-b border-border/40 select-none z-10">
              <tr>
                <th
                  onClick={() => handleSort("nome")}
                  className="px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  Operador {renderSortIcon("nome")}
                </th>
                <th
                  onClick={() => handleSort("total")}
                  className="px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-right"
                >
                  Total {renderSortIcon("total")}
                </th>
                <th
                  onClick={() => handleSort("retidos")}
                  className="px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-right text-success"
                >
                  Retidos {renderSortIcon("retidos")}
                </th>
                <th
                  onClick={() => handleSort("cancelados")}
                  className="px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-right text-danger"
                >
                  Cancelados {renderSortIcon("cancelados")}
                </th>
                <th
                  onClick={() => handleSort("tx")}
                  className="px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-right"
                >
                  Sucesso {renderSortIcon("tx")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-medium">
              {sortedData.map((op) => {
                const formattedTx = op.tx !== null ? `${(op.tx * 100).toFixed(1)}%` : "—";
                const isBelowMeta = op.tx !== null && op.tx < (meta / 100);

                return (
                  <tr key={op.login} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 truncate font-semibold text-foreground capitalize" title={op.login}>
                      {op.nome}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {op.total}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-success">
                      {op.retidos}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-danger">
                      {op.cancelados}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={[
                          "font-mono font-bold px-1.5 py-0.5 rounded",
                          isBelowMeta ? "text-danger bg-danger/5" : "text-foreground",
                        ].join(" ")}
                      >
                        {formattedTx}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
