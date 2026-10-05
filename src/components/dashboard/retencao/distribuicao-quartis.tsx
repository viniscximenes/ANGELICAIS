"use client";

import { useState } from "react";
import { Segmentado } from "./segmentado";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";

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

  // Filtra e ordena operadores (da menor taxa para a maior) por quartil;
  // empate de taxa → quem tem mais pedidos primeiro (pesa mais na equipe).
  const activeList = toggleMode === "equipe" ? operadores : operadoresPolo;
  const list = activeList
    .filter((op) => op.quartil === selectedQuartil)
    .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0) || b.total - a.total);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">
          Divisor de Quartil
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Operadores agrupados por quartil de taxa de retenção.
        </p>
      </div>

      {/*
        No trilho, o StyledCard é flex-col SEM h-full/flex-grow — só
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
        className="flex max-h-full flex-col gap-4"
      >
        {/* Sem linha divisória abaixo dos toggles (removida a pedido). */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Segmentado
            ariaLabel="Escopo do quartil"
            grupo="quartil-escopo"
            opcoes={[
              { valor: "equipe", rotulo: "Equipe" },
              { valor: "polo", rotulo: "Polo" },
            ]}
            valor={toggleMode}
            onChange={setToggleMode}
            tamanho="grande"
          />
          <Segmentado
            ariaLabel="Quartil selecionado"
            grupo="quartil-q"
            opcoes={([1, 2, 3, 4] as const).map((q) => ({ valor: q, rotulo: `Q${q}` }))}
            valor={selectedQuartil}
            onChange={setSelectedQuartil}
            tamanho="grande"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-tema">
          {/* data-tabela-quartis: cabeçalho no visual da tabela principal
              (reports-consolidado.css, junto com data-tabela-temas).
              data-cabecalho-fixo: cabeçalho sticky ao rolar (mesmo CSS). */}
          <table data-tabela-quartis data-cabecalho-fixo className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-body text-muted-foreground uppercase tracking-wide font-bold select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 whitespace-nowrap">Operador</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Pedidos</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Retidos</th>
                <th className="py-2.5 px-4 text-center w-[90px] whitespace-nowrap">Cancelados</th>
                <th className="py-2.5 px-4 text-center w-[120px] whitespace-nowrap">Tx Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center ds-body text-xs text-muted-foreground italic">
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
                  const txColor = abaixo ? "text-danger" : "text-success";

                  return (
                    <tr key={op.login}>
                      {/* Mesma hierarquia da "Taxa de retenção por tema":
                          nome em text-sm medium, números em peso normal, só a
                          taxa em destaque. Coluna "Quartil" removida — sempre
                          repetia o Q selecionado no filtro acima. */}
                      <td className="py-2.5 px-4 ds-body text-sm font-medium text-foreground truncate max-w-[220px]">
                        {displayName}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-sm !font-normal text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.total.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-sm !font-normal text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.retidos.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-4 text-center ds-mono-sm text-sm !font-normal text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {op.cancelados.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-2.5 px-4 text-center ds-mono-sm text-sm font-semibold ${txColor}`} style={{ fontVariantNumeric: "tabular-nums" }}>
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
