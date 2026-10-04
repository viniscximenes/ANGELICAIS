"use client";

import { useState } from "react";
import { toast } from "sonner";

import { GraficoEvolucao } from "@/components/dashboard/retencao/grafico-evolucao";
import { OperadorDetalheDialog } from "@/components/dashboard/retencao/operador-detalhe-dialog-lazy";
import { TabelaTemas } from "@/components/dashboard/retencao/tabela-temas";
import { VisaoGeralCards } from "@/components/dashboard/retencao/visao-geral-cards";
import {
  fetchComparativoDetalheAction,
  type ComparativoDetalheResult,
} from "@/lib/retencao/comparativo/actions";
import type { IndicadoresGestor } from "@/lib/retencao/comparativo/get-gestores-comparativo";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";

import { LinhaGestorComparativo } from "./linha-gestor-comparativo";
import { TabelaOperadoresComparativo } from "./tabela-operadores-comparativo";

/**
 * Metas por tema usadas pela TabelaTemas do analítico. O comparativo não
 * expõe o popover de configuração de metas — usa os mesmos defaults da
 * RetencaoDetalheSection (bloco analítico de /s/reports/consolidado) só para
 * colorir a coluna Tx.
 */
const THEME_METAS_DEFAULT: Record<string, number> = {
  "Mot. Financeiro": 80,
  "Ins. Atendimento": 80,
  "Ins. Serviço": 80,
  "Mud. Endereço": 60,
  "Mud. Provedora": 60,
  Outros: 60,
};

/** Mesmas barras e tom do skeleton do Analítico em /s/reports/consolidado. */
const SKELETON_BARRAS = [18, 42, 55, 70, 78, 64, 72, 50, 58, 74, 80, 46, 28, 12];
const SKELETON_BLOCO = "bg-[color-mix(in_oklab,var(--muted-foreground)_14%,transparent)]";

/**
 * Skeleton do detalhe do gestor (enquanto fetchComparativoDetalheAction
 * roda), no formato do conteúdo real: gráfico (mesma altura de 320px),
 * tabela de temas e tabela de operadores — no lugar do antigo
 * "Carregando detalhe…". Mesmo visual (tom, pulso) do skeleton do
 * Analítico no Consolidado.
 */
function DetalheGestorSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando detalhe do gestor">
      <div className="flex h-[320px] animate-pulse items-end gap-2 px-8 pb-6 motion-reduce:animate-none">
        {SKELETON_BARRAS.map((h, i) => (
          <div key={i} className={`${SKELETON_BLOCO} flex-1 rounded-t-[4px]`} style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="animate-pulse space-y-2 motion-reduce:animate-none">
        <div className={`${SKELETON_BLOCO} h-10 w-full rounded-md`} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${SKELETON_BLOCO} h-9 w-full rounded-md opacity-60`} />
        ))}
      </div>

      <div className="animate-pulse space-y-2 motion-reduce:animate-none">
        <div className={`${SKELETON_BLOCO} h-11 w-full rounded-md`} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className={`${SKELETON_BLOCO} h-10 w-full rounded-md opacity-60`} />
        ))}
      </div>
    </div>
  );
}

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

  // Card individual do operador (clique na linha da tabela de operadores) —
  // mesmo OperadorDetalheDialog de /s/reports/consolidado. Os dados do
  // operador já vêm no detalhe do gestor (getPorOperadorIndividual, a mesma
  // fonte do Consolidado), então abre sem nova busca.
  const [operadorSelecionado, setOperadorSelecionado] = useState<OperadorIndividual | null>(null);
  const [operadorMeta, setOperadorMeta] = useState(0);
  const [operadorDialogOpen, setOperadorDialogOpen] = useState(false);

  function abrirOperador(detalhe: Detalhe, login: string) {
    const operador = detalhe.operadores.find((op) => op.login === login);
    if (!operador) return;
    setOperadorSelecionado(operador);
    setOperadorMeta(detalhe.meta);
    setOperadorDialogOpen(true);
  }

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
        toast.error(res.error, {
          className: "operacao-comparativo-consolidado-toast",
        });
        setAbertoId((cur) => (cur === gestorId ? null : cur));
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar o detalhe do gestor.", {
        className: "operacao-comparativo-consolidado-toast",
      });
      setAbertoId((cur) => (cur === gestorId ? null : cur));
    } finally {
      setCarregandoId((cur) => (cur === gestorId ? null : cur));
    }
  }

  return (
    <div className="space-y-6">
      {/* Bloco fixo de topo: os 4 indicadores do gestor logado */}
      <section className="space-y-3">
        {/* data-visao-geral-cards: mesmo gancho de CSS do Consolidado
            (fundo dos cards no tema claro). semAnimacao: mesmo visual de
            entrada dos cards em /s/reports/consolidado. */}
        <div data-visao-geral-cards>
          <VisaoGeralCards
            data={{
              total: gestorLogado.pedidos,
              retidos: gestorLogado.retidos,
              cancelados: gestorLogado.cancelados,
              tx: gestorLogado.tx,
            }}
            meta={gestorLogado.meta}
            semAnimacao
          />
        </div>
      </section>

      {/* Comparativo entre gestores */}
      <section className="space-y-3">
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
                    {/* data-grafico-comparativo: o CSS da página esconde o
                        título, a descrição e a legenda (GraficoEvolucao é
                        compartilhado) — fica só o gráfico. */}
                    <div data-grafico-comparativo>
                      <GraficoEvolucao
                        dados={detalhe.evolucaoHora}
                        meta={detalhe.meta}
                        visualDetalhado
                      />
                    </div>
                    {/* data-temas-comparativo: o CSS da página esconde o
                        título e a descrição (TabelaTemas é compartilhado). */}
                    <div data-temas-comparativo>
                      <TabelaTemas
                        temas={detalhe.porTema}
                        metaGlobal={detalhe.meta}
                        themeMetas={THEME_METAS_DEFAULT}
                      />
                    </div>
                    <TabelaOperadoresComparativo
                      operadores={detalhe.operadores}
                      meta={detalhe.meta}
                      totais={{
                        retidos: g.retidos,
                        cancelados: g.cancelados,
                        pedidos: g.pedidos,
                        tx: g.tx,
                      }}
                      onOperadorClick={(login) => abrirOperador(detalhe, login)}
                    />
                  </>
                ) : (
                  <DetalheGestorSkeleton />
                )}
              </LinhaGestorComparativo>
            );
          })}
        </div>
      </section>

      {/*
        Marcador do tema do Consolidado: o OperadorDetalheDialog roda em
        portal e lê a fonte/cores do primeiro [data-page="reports-consolidado"]
        do DOM (lá, a própria página). Aqui não existe esse container, então
        este span vazio (dentro desta página, herdando a fonte dela) cumpre
        esse papel.
      */}
      <span data-page="reports-consolidado" hidden aria-hidden="true" />

      <OperadorDetalheDialog
        operador={operadorSelecionado}
        nomeExibido={
          operadorSelecionado
            ? operadorSelecionado.login.split("@")[0] || operadorSelecionado.login
            : ""
        }
        open={operadorDialogOpen}
        onOpenChange={setOperadorDialogOpen}
        meta={operadorMeta}
      />
    </div>
  );
}
