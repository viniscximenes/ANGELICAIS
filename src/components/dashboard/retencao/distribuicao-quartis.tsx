"use client";

import { useState } from "react";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import { IconAward } from "@tabler/icons-react";

interface DistribuicaoQuartisProps {
  operadores: OperadorQuartilItem[];
  operadoresPolo: OperadorQuartilItem[];
  hideTeamToggle?: boolean;
}

export function DistribuicaoQuartis({ operadores, operadoresPolo, hideTeamToggle }: DistribuicaoQuartisProps) {
  const [selectedQuartil, setSelectedQuartil] = useState<1 | 2 | 3 | 4>(4);
  const [toggleMode, setToggleMode] = useState<"equipe" | "polo">("equipe");

  // Filtra e ordena operadores (da menor taxa para a maior) baseados no escopo e quartil
  const effectiveMode = hideTeamToggle ? "polo" : toggleMode;
  const activeList = effectiveMode === "equipe" ? operadores : operadoresPolo;
  const list = activeList
    .filter((op) => op.quartil === selectedQuartil)
    .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0));

  const getQuartilColor = (q: 1 | 2 | 3 | 4) => {
    switch (q) {
      case 1: return "text-success border-success/30 bg-success/5";
      case 2: return "text-primary border-primary/30 bg-primary/5";
      case 3: return "text-warning border-warning/30 bg-warning/5";
      case 4: return "text-danger border-danger/30 bg-danger/5";
    }
  };

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4">
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconAward size={20} className="text-foreground" />
            Divisor De Quartil
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Operadores divididos em quartil, como Q1, Q2, Q3 e Q4 sobre a taxa de retenção.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Equipe vs Polo */}
          {!hideTeamToggle && (
            <div className="flex p-0.5 bg-muted/30 rounded-lg border border-border/30 w-fit shrink-0">
              {(["equipe", "polo"] as const).map((mode) => {
                const isActive = toggleMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setToggleMode(mode)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors capitalize cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle para selecionar o quartil */}
          <div className="flex p-0.5 bg-muted/30 rounded-lg border border-border/30 w-fit shrink-0">
            {([1, 2, 3, 4] as const).map((q) => {
              const isActive = selectedQuartil === q;
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuartil(q)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Q{q}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[10px] select-none border-b border-border/20">
              <th className="py-2.5 px-4 font-semibold">Operador</th>
              <th className="py-2.5 px-4 font-semibold text-center w-[90px]">Quartil</th>
              <th className="py-2.5 px-4 font-semibold text-center w-[90px]">Pedidos</th>
              <th className="py-2.5 px-4 font-semibold text-center w-[90px]">Retidos</th>
              <th className="py-2.5 px-4 font-semibold text-center w-[90px]">Cancelados</th>
              <th className="py-2.5 px-4 font-semibold text-center w-[120px]">Tx Retenção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground italic">
                  {toggleMode === "polo" 
                    ? `Nenhum operador da equipe está no Q${selectedQuartil} do polo.`
                    : `Nenhum operador da equipe neste quartil.`}
                </td>
              </tr>
            ) : (
              list.map((op) => {
                const displayName = op.login.includes("@") ? op.login.split("@")[0] : op.login;
                const txFormatted = op.tx !== null ? `${(op.tx * 100).toFixed(1)}%` : "—";
                
                // Determinando a cor com base no quartil
                let txColor = "text-foreground";
                if (selectedQuartil === 1) txColor = "text-success font-medium";
                if (selectedQuartil === 4) txColor = "text-danger font-medium";

                return (
                  <tr key={op.login} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-semibold text-foreground truncate max-w-[180px]">
                      {displayName}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getQuartilColor(selectedQuartil)}`}>
                        Q{selectedQuartil}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs font-mono text-muted-foreground">
                      {op.total.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs font-mono text-muted-foreground">
                      {op.retidos.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs font-mono text-muted-foreground">
                      {op.cancelados.toLocaleString("pt-BR")}
                    </td>
                    <td className={`py-2.5 px-4 text-center text-xs font-mono ${txColor}`}>
                      {txFormatted}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
