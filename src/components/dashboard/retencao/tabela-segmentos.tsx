"use client";

import { useState } from "react";
import type { SegmentoResult, SegmentoItem } from "@/lib/retencao/get-por-segmento";

interface TabelaSegmentosProps {
  segmentos: SegmentoResult;
  meta: number; // Meta de 0 a 100
  /**
   * Quando true, ocupa 100% da altura do container pai (que precisa ter
   * altura definida) e SÓ a lista de segmentos rola internamente — título e
   * o toggle Marca/Unidade ficam fixos fora do scroll. Mesmo padrão de
   * TabelaTemas/DistribuicaoQuartis, usado dentro do trilho horizontal de
   * /reports/consolidado (retencao-horizontal-scroll.tsx).
   */
  scrollInterno?: boolean;
}

/** Pluralização simples "N palavra" sem lib externa. */
function pluralizar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function TabelaSegmentos({ segmentos, meta, scrollInterno = false }: TabelaSegmentosProps) {
  const [activeTab, setActiveTab] = useState<"marca" | "unidade">("marca");

  const activeData: SegmentoItem[] =
    activeTab === "marca"
      ? segmentos.porMarca
      : segmentos.porUnidade;

  const tabLabels = [
    { id: "marca", label: "Marca" },
    { id: "unidade", label: "Unidade" },
  ] as const;

  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">
          Desempenho por Segmento
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Retenção agrupada por marca e filial.
        </p>
      </div>

      <div
        className={scrollInterno ? "flex max-h-full flex-col gap-3" : "space-y-3"}
      >
        {/* Seletor Marca / Unidade — mesmo padrão de toggle (tokens
            --seg-track/--seg-thumb/--seg-text já definidos em
            reports-consolidado.css) usado em DistribuicaoQuartis. */}
        <div className={`flex items-center border-b border-border/40 pb-3 ${scrollInterno ? "shrink-0" : ""}`}>
          <div
            role="radiogroup"
            aria-label="Agrupamento do segmento"
            className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] p-1"
          >
            {tabLabels.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-8 rounded-[calc(var(--radius)-2px)] px-3 text-xs font-bold outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] ${
                    isActive
                      ? "bg-[var(--seg-thumb)] text-[var(--seg-text-active)] border border-[var(--seg-thumb-border)]"
                      : "text-[var(--seg-text)] hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de segmentos com rolagem interna — mesma classe de
            scrollbar temática usada no modal de metas (scrollbar-tema). */}
        <div
          className={`${
            scrollInterno ? "min-h-0 flex-1" : "max-h-[280px]"
          } overflow-y-auto space-y-3.5 pr-2 scrollbar-tema`}
        >
          {activeData.length === 0 ? (
            <p className="ds-small text-muted-foreground text-center py-6 italic">
              Sem dados para este segmento.
            </p>
          ) : (
            [...activeData]
              .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0) || b.total - a.total)
              .map((item) => {
                const formattedTx = item.tx !== null ? `${(item.tx * 100).toFixed(1)}%` : "—";
                const isBelowMeta = item.tx !== null && item.tx < (meta / 100);
                const percentageWidth = item.tx !== null ? Math.min(100, Math.max(0, item.tx * 100)) : 0;

                let displayName = item.nome.toUpperCase();
                if (displayName === "MOBWIRE") {
                  displayName = "MOB";
                }

                const detalhe = `Pedidos: ${item.total} (${pluralizar(item.retidos, "retido", "retidos")} / ${pluralizar(item.cancelados, "cancelado", "cancelados")})`;

                return (
                  <div key={item.nome} className="space-y-1.5 border-b border-border/20 pb-3 last:border-0 hover:bg-accent transition-colors rounded-md px-1 -mx-1">
                    <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-1">
                      <div className="ds-body font-semibold text-foreground text-xs tracking-tight truncate max-w-[50%]" title={item.nome}>
                        {displayName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ds-small text-muted-foreground text-[11px]">
                          {detalhe}
                        </span>
                        <span
                          className={`ds-mono-sm font-semibold text-xs ${
                            isBelowMeta ? "text-danger" : "text-success"
                          }`}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formattedTx}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isBelowMeta ? "bg-danger" : "bg-success"
                        }`}
                        style={{ width: `${percentageWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
