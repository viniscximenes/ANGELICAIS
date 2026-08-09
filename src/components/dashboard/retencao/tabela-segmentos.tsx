"use client";

import { useState } from "react";
import { IconChartPie } from "@tabler/icons-react";
import type { SegmentoResult, SegmentoItem } from "@/lib/retencao/get-por-segmento";
import { StyledCard } from "@/components/gestor/styled-card";

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
    <div className="space-y-3">
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconChartPie size={20} className="text-foreground" />
          Desempenho por Segmento
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Visão agrupada de retenção por marca e filial de atendimento.
        </p>
      </div>

      <StyledCard className="p-4 space-y-3" withGradient corners="all">
        {/* Seletor Marca / Unidade */}
        <div className="flex items-center border-b border-border/40 pb-3">
          <div className="flex p-0.5 bg-muted/30 rounded-lg border border-border/30 w-fit">
            {tabLabels.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo do Segmento em Coluna Única com Barra de Rolagem */}
        <div className="max-h-[280px] overflow-y-auto space-y-3.5 pr-2 scrollbar-tema">
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

                return (
                  <div key={item.nome} className="space-y-1.5 border-b border-border/20 pb-3 last:border-0">
                    <div className="flex justify-between items-baseline text-xs">
                      <div className="font-semibold text-foreground text-xs tracking-tight truncate max-w-[50%]" title={item.nome}>
                        {displayName}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">
                          Vol: {item.total} ({item.retidos} ret / {item.cancelados} canc)
                        </span>
                        <span
                          className={`font-mono font-semibold text-xs ${
                            isBelowMeta ? "text-danger" : "text-success"
                          }`}
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
      </StyledCard>
    </div>
  );
}
