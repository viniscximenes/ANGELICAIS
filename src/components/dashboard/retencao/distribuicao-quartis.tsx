"use client";

import { useState } from "react";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";

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
        <h3 className="ds-h3 font-semibold text-foreground">
          Divisor de Quartil
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Operadores agrupados por quartil de taxa de retenção.
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
        espaço "sobrando" fica no wrapper pai (sem fundo). Container visual
        (StyledCard) removido a pedido.
      */}
      <div
        className={scrollInterno ? "flex max-h-full flex-col gap-4" : "space-y-4"}
      >
        <div className={`flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-border/40 pb-4 ${scrollInterno ? "shrink-0" : ""}`}>
          <div className="flex flex-wrap items-center gap-3">
            {/*
              Toggles no mesmo padrão visual confirmado em /kpi/operadores
              (SegmentedControl): trilho `--seg-track`/`--seg-track-border` +
              indicador `--seg-thumb` no item ativo (escuro no tema claro,
              claro no tema escuro) + `focus-visible:ring-[--ring]` em vez de
              borda branca de foco. Tokens já definidos em
              reports-consolidado.css. Reaproveitado como classes puras (não
              o componente inteiro, que é específico de /kpi/operadores).
            */}
            <div
              role="radiogroup"
              aria-label="Escopo do quartil"
              className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] p-1"
            >
              {(["equipe", "polo"] as const).map((mode) => {
                const isActive = toggleMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setToggleMode(mode)}
                    className={`h-8 rounded-[calc(var(--radius)-2px)] px-3 text-xs font-bold capitalize outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] ${
                      isActive
                        ? "bg-[var(--seg-thumb)] text-[var(--seg-text-active)] border border-[var(--seg-thumb-border)]"
                        : "text-[var(--seg-text)] hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <div
              role="radiogroup"
              aria-label="Quartil selecionado"
              className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] p-1"
            >
              {([1, 2, 3, 4] as const).map((q) => {
                const isActive = selectedQuartil === q;
                return (
                  <button
                    key={q}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setSelectedQuartil(q)}
                    className={`h-8 rounded-[calc(var(--radius)-2px)] px-3 text-xs font-bold outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] ${
                      isActive
                        ? "bg-[var(--seg-thumb)] text-[var(--seg-text-active)] border border-[var(--seg-thumb-border)]"
                        : "text-[var(--seg-text)] hover:text-foreground"
                    }`}
                  >
                    Q{q}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={scrollInterno ? "min-h-0 flex-1 overflow-auto scrollbar-tema" : "overflow-x-auto"}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-body text-muted-foreground/70 uppercase tracking-wide font-bold select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 whitespace-nowrap">Operador</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Quartil</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Pedidos</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Retidos</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Cancelados</th>
                <th className="py-2.5 px-4 text-center w-[120px] whitespace-nowrap">Tx Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center ds-body text-xs text-muted-foreground italic">
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
                    <tr key={op.login} className="hover:bg-accent transition-colors">
                      <td className="py-2.5 px-4 ds-body text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {displayName}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-xs font-medium text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        Q{selectedQuartil}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.total.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.retidos.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.cancelados.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-2.5 px-4 text-center ds-mono-sm text-xs ${txColor}`} style={{ fontVariantNumeric: "tabular-nums" }}>
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
    </div>
  );
}
