import { KpiFrame } from "./kpi-frame";

const TOTAL_LINHAS = 13;

function Bloco({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md ${className}`} />;
}

/** Skeleton da tabela de /kpi/operadores — usado no F5 (loading.tsx) e na
 * troca de mês. Formas do skeleton do Consolidado (s/reports/consolidado/
 * loading.tsx): blocos estáticos (sem pulse), cabeçalho com barra h-3 a 70%
 * em muted-foreground/20, corpo com blocos h-3 em bg-card (tom ajustado por
 * .kpi-operadores-skeleton no CSS da rota). Geometria desta tabela: mesma
 * classe kpi-operadores-table (larguras/divisórias reais), mesmo cabeçalho
 * temático, sem linhas horizontais no corpo, nomes centralizados. */
export function KpiTabelaSkeleton({ totalColunasDados }: { totalColunasDados: number }) {
  const colunas = Array.from({ length: totalColunasDados });

  return (
    <KpiFrame className="kpi-operadores-skeleton">
      <div
        role="status"
        aria-live="polite"
        aria-label="Carregando tabela de operadores"
        className="overflow-hidden"
      >
        <table className="kpi-operadores-table border-collapse text-sm" style={{ minWidth: 860 }}>
          <thead className="kpi-operadores-table-head ds-body font-bold text-foreground tracking-wide uppercase">
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="kpi-operadores-table-head-sticky h-10 px-3">
                <Bloco className="mx-auto h-3 w-[70%] bg-muted-foreground/20" />
              </th>
              {colunas.map((_, coluna) => (
                <th key={coluna} className="h-10 px-3">
                  <Bloco className="mx-auto h-3 w-[70%] bg-muted-foreground/20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_LINHAS }).map((_, linha) => (
              <tr key={linha}>
                <td className="h-9 px-3">
                  <Bloco className="mx-auto h-3 w-[60%] bg-card" />
                </td>
                {colunas.map((_, coluna) => (
                  <td key={coluna} className="h-9 px-3">
                    <Bloco className="mx-auto h-3 w-10 bg-card" />
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
