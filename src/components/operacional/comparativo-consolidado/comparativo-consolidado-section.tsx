"use client";

import { useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { GraficoEvolucao } from "@/components/dashboard/retencao/grafico-evolucao";
import { TabelaTemas } from "@/components/dashboard/retencao/tabela-temas";
import { VisaoGeralCards } from "@/components/dashboard/retencao/visao-geral-cards";
import {
  fetchComparativoDetalheAction,
  type ComparativoDetalheResult,
} from "@/lib/retencao/comparativo/actions";
import type { IndicadoresGestor } from "@/lib/retencao/comparativo/get-gestores-comparativo";

import { LinhaGestorComparativo } from "./linha-gestor-comparativo";
import { TabelaOperadoresComparativo } from "./tabela-operadores-comparativo";

/**
 * Metas por tema usadas pela TabelaTemas do analítico. O comparativo não
 * expõe o popover de configuração de metas — usa os mesmos defaults do
 * DashboardRetencaoSkeleton só para colorir a coluna Tx.
 */
const THEME_METAS_DEFAULT: Record<string, number> = {
  "Mot. Financeiro": 80,
  "Ins. Atendimento": 80,
  "Ins. Serviço": 80,
  "Mud. Endereço": 60,
  "Mud. Provedora": 60,
  Outros: 60,
};

type Detalhe = NonNullable<
  Extract<ComparativoDetalheResult, { success: true }>["data"]
>;

interface ComparativoConsolidadoSectionProps {
  gestorLogado: IndicadoresGestor & { meta: number };
  outrosGestores: IndicadoresGestor[];
}

export function ComparativoConsolidadoSection({
  gestorLogado,
  outrosGestores,
}: ComparativoConsolidadoSectionProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<Record<string, Detalhe>>({});

  // O gestor logado já aparece no bloco "Meus indicadores" acima — a lista
  // comparativa é só dos outros gestores (outrosGestores já vem sem ele).
  const todos = outrosGestores;

  async function toggle(gestorId: string) {
    if (abertoId === gestorId) {
      setAbertoId(null);
      return;
    }

    setAbertoId(gestorId);

    if (detalhes[gestorId]) return;

    setCarregandoId(gestorId);
    try {
      const res = await fetchComparativoDetalheAction(gestorId);
      if (res.success) {
        setDetalhes((prev) => ({ ...prev, [gestorId]: res.data }));
      } else {
        toast.error(res.error);
        setAbertoId((cur) => (cur === gestorId ? null : cur));
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar o detalhe do gestor.");
      setAbertoId((cur) => (cur === gestorId ? null : cur));
    } finally {
      setCarregandoId((cur) => (cur === gestorId ? null : cur));
    }
  }

  return (
    <div className="space-y-8">
      {/* Bloco fixo de topo: os 4 indicadores do gestor logado */}
      <section className="space-y-3">
        <h2 className="ds-h3 font-semibold text-foreground">Meus indicadores</h2>
        <VisaoGeralCards
          data={{
            total: gestorLogado.pedidos,
            retidos: gestorLogado.retidos,
            cancelados: gestorLogado.cancelados,
            tx: gestorLogado.tx,
          }}
          meta={gestorLogado.meta}
        />
      </section>

      {/* Comparativo entre gestores */}
      <section className="space-y-3">
        <div>
          <h2 className="ds-h3 font-semibold text-foreground">Comparativo entre gestores</h2>
          <p className="ds-small text-muted-foreground mt-1">
            Abra um gestor para ver a evolução por hora, a retenção por tema e a
            tabela de operadores dele.
          </p>
        </div>

        <div className="space-y-3">
          {todos.map((g) => {
            const ehLogado = g.id === gestorLogado.id;
            const detalhe = detalhes[g.id];
            return (
              <LinhaGestorComparativo
                key={g.id}
                indicadores={g}
                meta={gestorLogado.meta}
                destaque={ehLogado}
                aberto={abertoId === g.id}
                carregando={carregandoId === g.id}
                onToggle={() => toggle(g.id)}
              >
                {detalhe ? (
                  <>
                    <GraficoEvolucao dados={detalhe.evolucaoHora} meta={detalhe.meta} />
                    <TabelaTemas
                      temas={detalhe.porTema}
                      metaGlobal={detalhe.meta}
                      themeMetas={THEME_METAS_DEFAULT}
                    />
                    <TabelaOperadoresComparativo
                      operadores={detalhe.operadores}
                      meta={detalhe.meta}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <IconLoader2 size={18} className="animate-spin" />
                    <span className="ds-small">Carregando detalhe…</span>
                  </div>
                )}
              </LinhaGestorComparativo>
            );
          })}
        </div>
      </section>
    </div>
  );
}
