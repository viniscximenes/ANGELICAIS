"use client";

import { MESES_JANELA, type Periodo } from "@/lib/kpi/analise-operadores/periodo";
import type { KpisPreview } from "@/lib/kpi/analise-operadores/serial-types";

import { SkeletonRelatorio } from "./relatorio-fantasma";

/**
 * Estados de /kpi/evolucao sem relatório para mostrar — sem operador
 * selecionado ou operador sem dados no período. Em vez de uma caixa vazia
 * ou uma linha de texto solta, mostra o skeleton do relatório
 * (relatorio-fantasma.tsx, mesma construção do loading do Consolidado) na
 * estrutura real da página (um card por KPI principal de `getKpisPreview()`
 * + "KPIs secundários"), com a mensagem sobre cada gráfico.
 *
 * O skeleton é `aria-hidden`; a mensagem para leitor de tela fica fora dele.
 */

interface Props {
  kpisPreview: KpisPreview;
  periodo: Periodo;
  /** Texto sobre os gráficos. Padrão: "Sem operador selecionado". */
  mensagem?: string;
  /** Aviso para leitor de tela. */
  mensagemSr?: string;
}

export function EstadoVazioOperador({
  kpisPreview,
  periodo,
  mensagem = "Sem operador selecionado",
  mensagemSr = "Selecione um operador para ver o histórico completo.",
}: Props) {
  return (
    <div>
      <p className="sr-only">{mensagemSr}</p>
      <SkeletonRelatorio
        nPrincipais={kpisPreview.principais.length}
        nMeses={MESES_JANELA[periodo]}
        temSecundarios={kpisPreview.secundarios.length > 0}
        mensagem={mensagem}
      />
    </div>
  );
}
