"use client";

import { IconTargetArrow } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";
import type { ArgumentoItem } from "@/lib/retencao/get-efetividade-argumento";

interface EfetividadeArgumentoCardProps {
  argumentos: ArgumentoItem[];
  /** Ver comentário equivalente em tabela-temas.tsx — mesmo padrão de dimensionamento no trilho. */
  scrollInterno?: boolean;
}

/**
 * Volume de contratos retidos por técnica de negociação (`primeiro_nivel`).
 * Layout espelha tabela-temas.tsx (StyledCard + tabela, mesmo padrão de
 * scroll interno no trilho horizontal).
 *
 * Mostra só VOLUME, não "Tx de Retenção por técnica" — `primeiro_nivel`
 * nunca aparece preenchido em cancelamentos (100% null nos dados reais), sem
 * denominador consistente pra uma taxa (ver get-efetividade-argumento.ts).
 */
export function EfetividadeArgumentoCard({
  argumentos,
  scrollInterno = false,
}: EfetividadeArgumentoCardProps) {
  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconTargetArrow size={20} className="text-foreground" />
          Efetividade por Tipo de Argumento
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Volume de contratos retidos por técnica de negociação usada.
        </p>
      </div>

      <StyledCard
        className={scrollInterno ? "max-h-full overflow-y-auto p-0" : "p-0 overflow-hidden"}
        withGradient
        corners="all"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-mono-sm text-muted-foreground uppercase tracking-wider text-[11px] select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Técnica</th>
                <th className="py-2.5 px-4 font-semibold text-center w-[110px] whitespace-nowrap">
                  Retidos
                </th>
                <th className="py-2.5 px-4 font-semibold text-center w-[130px] whitespace-nowrap">
                  % do Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {argumentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-muted-foreground text-xs">
                    Nenhum contrato retido hoje.
                  </td>
                </tr>
              ) : (
                argumentos.map((item) => (
                  <tr key={item.categoria} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                      {item.categoria}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-foreground">
                      {item.quantidade.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      {(item.percentualDoTotal * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </StyledCard>
    </div>
  );
}
