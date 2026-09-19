"use client";

import { useState } from "react";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import { IconAward } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";

interface DistribuicaoQuartisProps {
  operadores: OperadorQuartilItem[];
  operadoresPolo: OperadorQuartilItem[];
  meta?: number;
  /**
   * Quando true, ocupa 100% da altura do container pai (que precisa ter
   * altura definida) e SÓ a tabela de operadores rola internamente —
   * título e os toggles (Equipe/Polo, Q1-Q4) ficam fixos fora do scroll.
   * Usado dentro do trilho horizontal de /reports/consolidado
   * (retencao-horizontal-scroll.tsx): o Q4 pode listar boa parte da
   * equipe/polo e não pode esticar a altura do trilho inteiro.
   */
  scrollInterno?: boolean;
}

export function DistribuicaoQuartis({
  operadores,
  operadoresPolo,
  meta = 65,
  scrollInterno = false,
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
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconAward size={20} className="text-foreground" />
          Divisor De Quartil
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Operadores divididos em quartil, como Q1, Q2, Q3 e Q4 sobre a taxa de retenção.
        </p>
      </div>

      {/*
        Em scrollInterno, o StyledCard é flex-col SEM h-full/flex-grow — só
        `max-h-full` (teto = altura do slot, herdada do wrapper pai com
        h-full). Poucos operadores no quartil selecionado → card baixo, sem
        sobra vazia dentro da borda. A barra de toggles fica `shrink-0`
        (fixa); o wrapper da tabela abaixo usa `flex-1 min-h-0 overflow-auto`
        — dentro de um container de altura auto/capada, um filho flex-1
        simplesmente assume a altura do próprio conteúdo (não estica), e só
        passa a rolar quando o conjunto bate no teto do `max-h-full`. O
        espaço "sobrando" fica no wrapper pai (sem fundo), não dentro do
        StyledCard.
      */}
      <StyledCard
        className={scrollInterno ? "flex max-h-full flex-col gap-4 p-5" : "p-5 space-y-4"}
        withGradient
        corners="all"
      >
        <div className={`flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-border/40 pb-4 ${scrollInterno ? "shrink-0" : ""}`}>
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

        <div className={scrollInterno ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
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
