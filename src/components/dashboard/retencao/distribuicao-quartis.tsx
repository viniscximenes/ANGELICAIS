"use client";

import { useState } from "react";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import { IconAward } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";

interface DistribuicaoQuartisProps {
  operadores: OperadorQuartilItem[];
  operadoresPolo: OperadorQuartilItem[];
  meta?: number;
}

export function DistribuicaoQuartis({
  operadores,
  operadoresPolo,
  meta = 65,
}: DistribuicaoQuartisProps) {
  const [selectedQuartil, setSelectedQuartil] = useState<1 | 2 | 3 | 4>(4);
  const [toggleMode, setToggleMode] = useState<"equipe" | "polo">("equipe");

  const metaFracao = meta / 100;

  // Filtra e ordena operadores (da menor taxa para a maior) por quartil
  const effectiveMode = toggleMode;
  const activeList = effectiveMode === "equipe" ? operadores : operadoresPolo;
  const list = activeList
    .filter((op) => op.quartil === selectedQuartil)
    .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconAward size={20} className="text-foreground" />
          Divisor De Quartil
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Operadores divididos em quartil, como Q1, Q2, Q3 e Q4 sobre a taxa de retenção.
        </p>
      </div>

      <StyledCard className="p-5 space-y-4" withGradient corners="all">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-border/40 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Equipe vs Polo */}
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
              <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[11px] select-none border-b border-border/40 bg-muted/40">
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
                  
                  // Verde se bateu a meta, vermelho se não bateu
                  const abaixo = op.tx === null || op.tx < metaFracao;
                  const txColor = abaixo ? "text-danger font-medium" : "text-success font-medium";

                  return (
                    <tr key={op.login} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {displayName}
                      </td>
                      <td className="py-2.5 px-4 text-center text-xs font-mono font-medium text-muted-foreground">
                        Q{selectedQuartil}
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
      </StyledCard>
    </div>
  );
}
