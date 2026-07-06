"use client";

import { useState } from "react";
import { IconChartPie } from "@tabler/icons-react";
import type { SegmentoResult, SegmentoItem } from "@/lib/retencao/get-por-segmento";
interface TabelaSegmentosProps {
  segmentos: SegmentoResult;
  meta: number; // Meta de 0 a 100
}

export function TabelaSegmentos({ segmentos, meta }: TabelaSegmentosProps) {
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
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4 flex flex-col justify-between">
      <div className="space-y-1">
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconChartPie size={20} className="text-foreground" />
          Desempenho por Segmento
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Visão agrupada de retenção por marca e filial de atendimento.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="elevation-1 inline-flex gap-1 rounded-md p-1 bg-muted/20 w-fit self-start">
        {tabLabels.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-1.5 rounded-md font-medium transition-all text-xs cursor-pointer",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Segment Content */}
      <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-4 pr-1 scrollbar-tema">
        {activeData.length === 0 ? (
          <p className="ds-small text-muted-foreground text-center py-10 italic">
            Sem dados para este segmento.
          </p>
        ) : (
          [...activeData]
            .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0) || b.total - a.total)
            .map((item) => {
              const formattedTx = item.tx !== null ? `${(item.tx * 100).toFixed(1)}%` : "—";
              const isBelowMeta = item.tx !== null && item.tx < (meta / 100);
              const percentageWidth = item.tx !== null ? item.tx * 100 : 0;

              let displayName = item.nome.toUpperCase();
              if (displayName === "MOBWIRE") {
                displayName = "MOB";
              }

              return (
                <div key={item.nome} className="space-y-1.5 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-baseline text-xs">
                    <div className="font-semibold text-foreground truncate max-w-[50%]" title={item.nome}>
                      {displayName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">
                        Vol: <strong>{item.total}</strong> ({item.retidos} retidos / {item.cancelados} cancelados)
                      </span>
                      <span
                        className={[
                          "font-mono font-bold text-xs px-2 py-0.5 rounded",
                          isBelowMeta ? "text-danger bg-danger/5" : "text-foreground bg-muted/40",
                        ].join(" ")}
                      >
                        {formattedTx}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={[
                        "h-full rounded-full transition-all duration-300",
                        isBelowMeta ? "bg-danger" : "bg-success",
                      ].join(" ")}
                      style={{ width: `${percentageWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
