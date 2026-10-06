"use client";

import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";
import { CabecalhoSecao } from "@/components/gestor/cabecalho-secao";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { useTopoAoCarregar } from "@/lib/lenis/use-topo-ao-carregar";
import { calcularPesoDesigual } from "@/lib/tma/calcular-peso-desigual";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import type { GestorTmaAnaliticoResult } from "@/lib/tma/get-gestor-tma-analitico";
import { AnaliticoTmaTabela } from "./analitico-tma-tabela";
import { CardForaDaCurva } from "./card-fora-da-curva";
import { CardPesoDesigual } from "./card-peso-desigual";
import { CardRechamada } from "./card-rechamada";
import { CardsResumoTma } from "./cards-resumo-tma";
import { EvolucaoTmaChart } from "./evolucao-tma-chart";
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
export function AnaliticoTmaSection({ roster, analitico, operadores }: AnaliticoTmaSectionProps) {
  // Abre sempre no topo (ver use-topo-ao-carregar.ts). Fica AQUI, no
  // componente que renderiza o trilho: em GestorTmaSection o
  // ScrollTrigger.update() rodava antes do pin existir e "picava" a tela.
  useTopoAoCarregar();

  const pesoDesigual = calcularPesoDesigual(operadores);
  const hasNoData = analitico.totalAtendidos === 0;
  const cabecalho = <CabecalhoSecao titulo="Analítico" />;

  return (
    <section aria-label="Analítico do TMA">
      {hasNoData && cabecalho}

      {hasNoData ? (
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
                <EvolucaoTmaChart dados={analitico.evolucaoPorHora} thresholdConfig={analitico.thresholdConfig} />
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
      <div className={hasNoData ? "mt-10" : "mt-10 lg:hidden"}>
        <SignatureFooter />
      </div>
    </section>
  );
}
