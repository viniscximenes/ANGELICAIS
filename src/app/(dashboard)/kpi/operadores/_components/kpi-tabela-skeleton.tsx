"use client";

import { KpiFrame } from "./kpi-frame";

/**
 * Skeleton mostrado SÓ no primeiro carregamento de um mês sem nenhuma
 * tabela anterior em tela pra manter visível (edge case — normalmente
 * sempre há uma tabela anterior mantida com opacity reduzida enquanto o mês
 * novo carrega, ver `dataExibida`/`isLoadingAtual` em kpi-equipe-section.tsx).
 * Mesmas colunas do momento (headers) e ~8 linhas, dentro das mesmas
 * cantoneiras (KpiFrame) da tabela real.
 */
export function KpiTabelaSkeleton({ headers }: { headers: { slug: string }[] }) {
  const linhas = Array.from({ length: 8 });

  return (
    <KpiFrame>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-3 py-2.5">
                <div className="mx-auto h-3.5 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              </th>
              {headers.map((h) => (
                <th key={h.slug} className="px-3 py-2.5">
                  <div className="mx-auto h-3.5 w-14 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((_, i) => (
              <tr
                key={i}
                style={{
                  borderBottom:
                    i < linhas.length - 1
                      ? "1px solid color-mix(in srgb, var(--border) 60%, transparent)"
                      : undefined,
                }}
              >
                <td className="px-3 py-2">
                  <div className="mx-auto h-3.5 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </td>
                {headers.map((h) => (
                  <td key={h.slug} className="px-3 py-2">
                    <div className="mx-auto h-3.5 w-12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
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
