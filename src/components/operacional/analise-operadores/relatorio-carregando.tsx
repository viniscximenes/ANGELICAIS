"use client";

import { MESES_JANELA, type Periodo } from "@/lib/kpi/analise-operadores/periodo";
import type { KpisPreview } from "@/lib/kpi/analise-operadores/serial-types";

import { SkeletonRelatorio } from "./relatorio-fantasma";

/**
 * Loading ao trocar operador, período (3/6/12 meses) ou "incluir mês
 * atual" em /kpi/evolucao — o skeleton do relatório
 * (relatorio-fantasma.tsx, mesma construção do loading do Consolidado) no
 * lugar do relatório anterior, na janela de meses NOVA (o número de
 * marcadores de quartil já acompanha o período escolhido). Sem spinner nem
 * banner (como no Consolidado): só o skeleton + aviso para leitor de tela.
 *
 * Não é o loading.tsx (esse é o Suspense fallback de NAVEGAÇÃO de rota —
 * cobre entrar na página, não as trocas dentro dela).
 */
export function RelatorioCarregando({
  kpisPreview,
  periodo,
  nomeOperador,
}: {
  kpisPreview: KpisPreview;
  periodo: Periodo;
  nomeOperador: string;
}) {
  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        Carregando dados de {nomeOperador}…
      </div>
      <SkeletonRelatorio
        nPrincipais={kpisPreview.principais.length}
        nMeses={MESES_JANELA[periodo]}
        temSecundarios={kpisPreview.secundarios.length > 0}
      />
    </div>
  );
}
