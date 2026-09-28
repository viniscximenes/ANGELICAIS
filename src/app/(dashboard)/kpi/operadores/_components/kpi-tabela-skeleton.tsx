"use client";

import { KpiFrame } from "./kpi-frame";

/** Skeleton exclusivo da troca de mês em /kpi/operadores. Replica a estrutura
 * visual usada no Consolidado: KpiFrame real, cabeçalho temático e linhas com
 * altura estável. Só substitui a tabela; cabeçalho e controles da página não
 * são remontados durante o carregamento. */
export function KpiTabelaSkeleton({ totalColunasDados }: { totalColunasDados: number }) {
  const linhas = Array.from({ length: 12 });
  const colunas = Array.from({ length: totalColunasDados });

  return (
    <KpiFrame>
      <div
        role="status"
        aria-live="polite"
        aria-label="Carregando tabela de operadores"
        className="overflow-x-auto"
      >
        <table className="kpi-operadores-table border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead className="kpi-operadores-table-head ds-body font-bold text-foreground tracking-wide uppercase">
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="kpi-operadores-table-head-sticky sticky left-0 h-10 min-w-[190px] px-4">
                <div className="mx-auto h-3 w-16 animate-pulse rounded bg-muted-foreground/20 motion-reduce:animate-none" />
              </th>
              {colunas.map((_, coluna) => (
                <th key={coluna} className="h-10 px-2">
                  <div className="mx-auto h-3 w-14 animate-pulse rounded bg-muted-foreground/20 motion-reduce:animate-none" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((_, i) => (
              <tr key={i}>
                <td className="h-9 min-w-[190px] px-4">
                  <div className="mx-auto h-3 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </td>
                {colunas.map((_, coluna) => (
                  <td key={coluna} className="h-9 px-3">
                    <div className="mx-auto h-3 w-12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </KpiFrame>
  );
}
