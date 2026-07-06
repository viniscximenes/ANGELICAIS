"use client";

import { useState, useMemo, Fragment } from "react";
import { IconChevronDown, IconChevronRight, IconSelector, IconChevronUp, IconTags } from "@tabler/icons-react";
import type { TemaData } from "@/lib/retencao/get-por-tema";

interface TabelaTemasProps {
  temas: TemaData[];
  metaGlobal: number;
  themeMetas: Record<string, number>;
}

type SortField = "motivo" | "total" | "retidos" | "cancelados" | "tx";
type SortOrder = "asc" | "desc";

export function TabelaTemas({ temas, metaGlobal, themeMetas }: TabelaTemasProps) {
  const [expandedMotivos, setExpandedMotivos] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortField>("tx");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  function toggleExpand(motivo: string) {
    setExpandedMotivos((prev) => ({
      ...prev,
      [motivo]: !prev[motivo],
    }));
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // default desc ao mudar de campo
    }
  };

  // Processamento de ordenação nos motivos principais
  const sortedTemas = useMemo(() => {
    const data = [...temas];

    data.sort((a, b) => {
      let valA = a[sortBy === "tx" ? "tx" : sortBy] as string | number | null;
      let valB = b[sortBy === "tx" ? "tx" : sortBy] as string | number | null;

      if (sortBy === "motivo") {
        valA = a.motivo.toLowerCase();
        valB = b.motivo.toLowerCase();
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [temas, sortBy, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <IconSelector size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors shrink-0" />;
    }
    return sortOrder === "asc" ? (
      <IconChevronUp size={13} className="text-primary shrink-0 font-bold" />
    ) : (
      <IconChevronDown size={13} className="text-primary shrink-0 font-bold" />
    );
  };

  const getTxColor = (tx: number | null, motivo?: string) => {
    if (tx === null) return "text-muted-foreground";
    const rawMeta = (motivo && themeMetas && themeMetas[motivo] !== undefined) ? themeMetas[motivo] : metaGlobal;
    const themeMeta = Number(rawMeta);
    return tx < themeMeta / 100 ? "text-danger font-medium" : "text-success font-medium";
  };

  /**
   * Limpa o nome do submotivo para não repetir redundantemente o termo do motivo pai
   */
  function getCleanSubmotivo(subName: string, parentName: string): string {
    let clean = subName.trim();
    const parentTerms = [
      parentName,
      "Mud. Endereço",
      "Mudança de Endereço",
      "Problemas",
      "Insatisfação com o",
      "Insatisfação com",
      "Mudança de Provedor",
      "Mud. Provedora",
      "Mot. Financeiro",
      "Insatisfação Geral",
      "Ins. Atendimento",
      "Ins. Serviço"
    ];

    for (const term of parentTerms) {
      const escapedTerm = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`^${escapedTerm}\\s*[-/:]?\\s*`, "i");
      if (regex.test(clean)) {
        clean = clean.replace(regex, "");
      }
    }

    if (!clean) return "Sem Submotivo";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl overflow-hidden">
      <div>
        <div className="p-5 border-b border-border/40">
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconTags size={20} className="text-foreground" />
            Retenção por Tema
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Clique nos motivos para expandir e verificar os submotivos correspondentes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
             <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[11px] select-none border-b border-border/40">
              <th className="py-2.5 px-4 text-center w-[40px] whitespace-nowrap"></th>
              <th 
                className={[
                  "py-2.5 px-4 font-semibold cursor-pointer transition-colors group whitespace-nowrap",
                  sortBy === "motivo" ? "text-foreground font-bold" : "hover:text-foreground",
                ].join(" ")}
                onClick={() => handleSort("motivo")}
              >
                <div className="flex items-center gap-1.5">Motivo {renderSortIcon("motivo")}</div>
              </th>
              <th 
                className={[
                  "py-2.5 px-4 font-semibold cursor-pointer text-center transition-colors w-[110px] group whitespace-nowrap",
                  sortBy === "total" ? "text-foreground font-bold" : "hover:text-foreground",
                ].join(" ")}
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center justify-center gap-1.5">Total {renderSortIcon("total")}</div>
              </th>
              <th 
                className={[
                  "py-2.5 px-4 font-semibold cursor-pointer text-center transition-colors w-[110px] group whitespace-nowrap",
                  sortBy === "retidos" ? "text-foreground font-bold" : "hover:text-foreground",
                ].join(" ")}
                onClick={() => handleSort("retidos")}
              >
                <div className="flex items-center justify-center gap-1.5">Retidos {renderSortIcon("retidos")}</div>
              </th>
              <th 
                className={[
                  "py-2.5 px-4 font-semibold cursor-pointer text-center transition-colors w-[110px] group whitespace-nowrap",
                  sortBy === "cancelados" ? "text-foreground font-bold" : "hover:text-foreground",
                ].join(" ")}
                onClick={() => handleSort("cancelados")}
              >
                <div className="flex items-center justify-center gap-1.5">Cancelados {renderSortIcon("cancelados")}</div>
              </th>
              <th 
                className={[
                  "py-2.5 px-4 font-semibold cursor-pointer text-center transition-colors w-[130px] group whitespace-nowrap",
                  sortBy === "tx" ? "text-foreground font-bold" : "hover:text-foreground",
                ].join(" ")}
                onClick={() => handleSort("tx")}
              >
                <div className="flex items-center justify-center gap-1.5">Tx Retenção {renderSortIcon("tx")}</div>
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
                      const displaySubName = getCleanSubmotivo(sub.submotivo, tema.motivo);

                      return (
                        <tr key={sub.submotivo} className="bg-black/5 hover:bg-muted/10 border-b border-border/10 transition-colors">
                          <td className="py-2.5 px-4"></td>
                          <td className="py-2.5 px-4 pl-8 text-muted-foreground text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                            <span>{displaySubName}</span>
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
      </div>
    </div>
  );
}
