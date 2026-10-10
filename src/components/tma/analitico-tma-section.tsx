"use client";

import { useCallback, useEffect, useState } from "react";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";
import { CabecalhoSecao } from "@/components/gestor/cabecalho-secao";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { useTopoAoCarregar } from "@/lib/lenis/use-topo-ao-carregar";
import { onBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import { notifyTrilhoDisponivel } from "@/lib/retencao/scroll-to-card-event";
import { refreshAnaliticoTmaAction } from "@/lib/tma/actions/refresh-analitico-tma-action";
import { calcularPesoDesigual } from "@/lib/tma/calcular-peso-desigual";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import type { GestorTmaAnaliticoResult } from "@/lib/tma/get-gestor-tma-analitico";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { AnaliticoTmaTabela } from "./analitico-tma-tabela";
import { CardForaDaCurva } from "./card-fora-da-curva";
import { CardPesoDesigual } from "./card-peso-desigual";
import { CardRechamada } from "./card-rechamada";
import { CardsResumoTma } from "./cards-resumo-tma";
import { EvolucaoTmaChart } from "./evolucao-tma-chart-lazy";
import { TmaPorTemaCard } from "./tma-por-tema-card";

interface AnaliticoTmaSectionProps {
  roster: string[];
  analitico: GestorTmaAnaliticoResult;
  /** Operadores já carregados por getGestorTma (d1_tma) — fonte do card Peso Desigual, sem query nova. */
  operadores: OperadorTma[];
}

/**
 * Bloco "Analítico" da TMA — mesmo padrão de RetencaoDetalheSection
 * (Consolidado): título com divisória; sem atendimentos no dia, o gráfico
 * esqueleto parado com a mensagem; com dado, o trilho horizontal pinado de
 * ALTURA FIXA (os cards rolam por dentro, com cabeçalho fixo).
 *
 * Slides (tma-nav-sidebar.tsx precisa bater com esta ordem):
 *   0. Cards (TMA/Atendidos) + "Evolução da equipe"
 *   1. TMA por tema - Operador (AnaliticoTmaTabela)
 *   2. TMA por tema - Supervisor (TmaPorTemaCard)
 *   3. Rechamada
 *   4. Fora da curva
 *   5. Peso desigual
 */
export function AnaliticoTmaSection({
  roster: rosterInicial,
  analitico: analiticoInicial,
  operadores: operadoresInicial,
}: AnaliticoTmaSectionProps) {
  // Abre sempre no topo (ver use-topo-ao-carregar.ts). Fica AQUI, no
  // componente que renderiza o trilho: em GestorTmaSection o
  // ScrollTrigger.update() rodava antes do pin existir e "picava" a tela.
  useTopoAoCarregar();

  // Dados iniciais vêm do servidor (page.tsx); depois são recarregados pela
  // action quando a tabela avisa que a base mudou (polling com versão nova,
  // "Limpar Base" ou meta salva) — antes o Analítico só mudava com F5.
  const [dados, setDados] = useState({
    roster: rosterInicial,
    analitico: analiticoInicial,
    operadores: operadoresInicial,
  });
  const [erro, setErro] = useState(analiticoInicial.erro);

  const carregar = useCallback(async (activeRef: { current: boolean }) => {
    try {
      const result = await refreshAnaliticoTmaAction();
      if (!activeRef.current) return;
      if (result.success) {
        setDados({ roster: result.roster, analitico: result.analitico, operadores: result.operadores });
        setErro(false);
      } else {
        setErro(true);
      }
    } catch (err) {
      if (!activeRef.current || handleStaleActionError(err)) return;
      setErro(true);
      console.error("[AnaliticoTmaSection] erro ao recarregar o Analítico:", err);
    }
  }, []);

  // Mesmo sinal usado pelo Analítico do Consolidado (base-cleared-event.ts),
  // disparado aqui por GestorTmaSection.
  useEffect(() => {
    const activeRef = { current: true };
    const unsubscribe = onBaseAtualizada(() => {
      void carregar(activeRef);
    });
    return () => {
      activeRef.current = false;
      unsubscribe();
    };
  }, [carregar]);

  const { roster, analitico, operadores } = dados;
  const pesoDesigual = calcularPesoDesigual(operadores);
  const hasNoData = analitico.totalAtendidos === 0;
  const cabecalho = <CabecalhoSecao titulo="Analítico" />;

  // Avisa a sidebar (TmaNavSidebar) se os cards do trilho existem — sem eles
  // os itens dela não têm pra onde rolar. Mesmo sinal do Analítico do
  // Consolidado (RetencaoDetalheSection).
  const trilhoDisponivel = !erro && !hasNoData;
  useEffect(() => {
    notifyTrilhoDisponivel(trilhoDisponivel);
  }, [trilhoDisponivel]);
  useEffect(() => () => notifyTrilhoDisponivel(false), []);

  return (
    <section aria-label="Analítico do TMA">
      {(erro || hasNoData) && cabecalho}

      {erro ? (
        // Erro de banco: mesmo estado de erro do Analítico do Consolidado
        // (gráfico esqueleto parado, mensagem e "Tentar novamente") — antes
        // caía em "Aguardando dados do dia".
        <GraficoVazio
          titulo="Não foi possível carregar o Analítico"
          descricao="Houve uma falha ao consultar a base. Tente novamente em instantes."
          altura={350}
          erro
          acao={
            <button
              type="button"
              onClick={() => void carregar({ current: true })}
              className="font-sans border-border text-foreground hover:bg-muted/40 inline-flex h-8 cursor-pointer items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Tentar novamente
            </button>
          }
        />
      ) : hasNoData ? (
        <GraficoVazio
          titulo="Aguardando dados do dia"
          descricao="Ainda não há atendimentos de TMA reportados hoje pra sua equipe."
          altura={350}
        />
      ) : (
        <div className="space-y-6">
          <RetencaoHorizontalScroll
            header={cabecalho}
            slides={[
              <div key="cards-e-evolucao" className="flex flex-col gap-6">
                <CardsResumoTma
                  tmaMedioPonderado={analitico.tmaMedioPonderado}
                  tmaStatus={analitico.tmaStatus}
                  totalAtendidos={analitico.totalAtendidos}
                />
                {/* Mesmo visual/regras do "Evolução da equipe" do Consolidado
                    (EvolucaoEquipe), adaptado ao TMA. */}
                <EvolucaoTmaChart
                  dados={analitico.evolucaoPorHora}
                  thresholdConfig={analitico.thresholdConfig}
                  titulo="Evolução da equipe"
                  descricao="Atendimentos por hora, com o TMA da equipe em cada hora e o total do dia. Passe o mouse para ver os operadores fora da meta em cada hora."
                />
              </div>,
              <AnaliticoTmaTabela
                key="tabela-operador-bucket"
                roster={roster}
                porOperadorPorBucket={analitico.porOperadorPorBucket}
              />,
              <TmaPorTemaCard key="tma-por-tema-gestor" tmaPorBucketEquipe={analitico.tmaPorBucketEquipe} />,
              <CardRechamada
                key="rechamada"
                clientesDistintos={analitico.rechamada.clientesDistintos}
                clientesRecorrentes={analitico.rechamada.clientesRecorrentes}
                percentual={analitico.rechamada.percentual}
                lista={analitico.rechamada.lista}
              />,
              <CardForaDaCurva
                key="fora-da-curva"
                curtas={analitico.foraDaCurva.curtas}
                longas={analitico.foraDaCurva.longas}
                curtasLista={analitico.foraDaCurva.curtasLista}
                longasLista={analitico.foraDaCurva.longasLista}
              />,
              // Assinatura DENTRO do último slide, só no desktop: aparece
              // logo abaixo do último card e desliza junto. O card cede
              // altura pra ela via min-h-0 (só a tabela rola por dentro).
              // Mobile (slides empilhados) usa a do fim da seção.
              <div key="peso-desigual" className="flex h-full flex-col">
                <div className="min-h-0">
                  <CardPesoDesigual operadores={pesoDesigual} />
                </div>
                <div className="mt-10 hidden shrink-0 lg:block">
                  <SignatureFooter />
                </div>
              </div>,
            ]}
          />
        </div>
      )}

      {/* Assinatura no fim da seção — com o trilho ativo, no desktop ela já
          aparece dentro do último slide. */}
      <div className={erro || hasNoData ? "mt-10" : "mt-10 lg:hidden"}>
        <SignatureFooter />
      </div>
    </section>
  );
}
