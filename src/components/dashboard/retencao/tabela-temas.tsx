"use client";

import { useState, useMemo, Fragment } from "react";
import { IconChevronDown, IconChevronRight, IconTags } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";
import type { TemaData } from "@/lib/retencao/get-por-tema";

interface TabelaTemasProps {
  temas: TemaData[];
  metaGlobal: number;
  themeMetas: Record<string, number>;
}

export function TabelaTemas({ temas, metaGlobal, themeMetas }: TabelaTemasProps) {
  const [expandedMotivos, setExpandedMotivos] = useState<Record<string, boolean>>({});

  function toggleExpand(motivo: string) {
    setExpandedMotivos((prev) => ({
      ...prev,
      [motivo]: !prev[motivo],
    }));
  }

  // Ordena automaticamente os motivos da maior para a menor taxa de retenção (tx desc)
  const sortedTemas = useMemo(() => {
    return [...temas].sort((a, b) => {
      if (a.tx === null && b.tx === null) return 0;
      if (a.tx === null) return 1;
      if (b.tx === null) return -1;
      return b.tx - a.tx;
    });
  }, [temas]);

  const getTxColor = (tx: number | null, motivo?: string) => {
    if (tx === null) return "text-muted-foreground";
    const rawMeta = (motivo && themeMetas && themeMetas[motivo] !== undefined) ? themeMetas[motivo] : metaGlobal;
    const themeMeta = Number(rawMeta);
    return tx < themeMeta / 100 ? "text-danger font-medium" : "text-success font-medium";
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconTags size={20} className="text-foreground" />
          Retenção por Tema
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Clique nos motivos para expandir e verificar os submotivos correspondentes.
        </p>
      </div>

      <StyledCard className="p-0 overflow-hidden" withGradient corners="all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[11px] select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 text-center w-[40px] whitespace-nowrap"></th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                  Motivo
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Total
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Retidos
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Cancelados
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[130px] whitespace-nowrap">
                  Tx Retenção
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedTemas.map((tema) => {
                const isExpanded = !!expandedMotivos[tema.motivo];
                const txFormatted = tema.tx !== null ? `${(tema.tx * 100).toFixed(1)}%` : "—";

                return (
                  <Fragment key={tema.motivo}>
                    {/* Linha do Motivo Principal */}
                    <tr 
                      className="hover:bg-muted/10 cursor-pointer transition-colors group"
                      onClick={() => toggleExpand(tema.motivo)}
                    >
                      <td className="py-3 px-4 text-center">
                        <div className="text-muted-foreground/60 group-hover:text-foreground transition-colors inline-block">
                          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                        {tema.motivo}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {tema.total.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {tema.retidos.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                        {tema.cancelados.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-3 px-4 text-center text-xs font-semibold ${getTxColor(tema.tx, tema.motivo)}`}>
                        {txFormatted}
                      </td>
                    </tr>

                    {/* Submotivos em Drill-down */}
                    {isExpanded && tema.submotivos.map((sub) => {
                      const subTxFormatted = sub.tx !== null ? `${(sub.tx * 100).toFixed(1)}%` : "—";

                      return (
                        <tr key={sub.submotivo} className="bg-black/5 hover:bg-muted/10 border-b border-border/10 transition-colors">
                          <td className="py-2.5 px-4"></td>
                          <td className="py-2.5 px-4 pl-8 text-muted-foreground text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                            <span>{sub.submotivo}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono-sm text-muted-foreground text-xs">
                            {sub.total.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono-sm text-muted-foreground text-xs">
                            {sub.retidos.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono-sm text-muted-foreground text-xs">
                            {sub.cancelados.toLocaleString("pt-BR")}
                          </td>
                          <td className={`py-2.5 px-4 text-center font-mono-sm text-xs ${getTxColor(sub.tx, tema.motivo)}`}>
                            {subTxFormatted}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </StyledCard>
    </div>
  );
}
