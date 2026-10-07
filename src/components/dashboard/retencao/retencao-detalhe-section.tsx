"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTopoAoCarregar } from "@/lib/lenis/use-topo-ao-carregar";
import { fetchDashboardRetencaoAction } from "@/lib/retencao/actions";
import { onBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import { notifyTrilhoDisponivel } from "@/lib/retencao/scroll-to-card-event";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import type { SegmentoResult } from "@/lib/retencao/get-por-segmento";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import type { ImpactoFaceIdData } from "@/lib/retencao/get-impacto-faceid";
import type { ArgumentoItem } from "@/lib/retencao/get-efetividade-argumento";
import { VisaoGeralCards } from "./visao-geral-cards";
import { EvolucaoEquipe } from "./evolucao-equipe";
import { TabelaTemas } from "./tabela-temas";
import { TabelaSegmentos } from "./tabela-segmentos";
import { DistribuicaoQuartis } from "./distribuicao-quartis";
import { CopiarContratos } from "./copiar-contratos";
import { ImpactoFaceIdCard } from "./impacto-faceid-card";
import { EfetividadeArgumentoCard } from "./efetividade-argumento-card";
import { AnaliticoSkeleton, GraficoVazio } from "./analitico-skeleton";
import {
  DEFAULT_THEME_METAS,
  lerThemeMetas,
  onMetasAtualizadas,
} from "@/lib/retencao/metas-consolidado";
import { RetencaoHorizontalScroll } from "./retencao-horizontal-scroll";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { CabecalhoSecao } from "@/components/gestor/cabecalho-secao";


interface RetencaoDetalheSectionProps {
  /** profiles.id do gestor logado — chave de escopo das metas por tema (localStorage). */
  gestorId: string;
  /** Meta geral da taxa (%) — a MESMA da EquipeTable (gestor_config_fantasia.meta_tx_retencao). */
  metaInicial: number;
}

/**
 * Seção de detalhamento analítico (temas, evolução por hora, segmentos,
 * quartis, operadores) exibida dentro de /s/reports/consolidado, abaixo da
 * EquipeTable. Busca os próprios dados client-side (retencao_atendimentos)
 * via `fetchDashboardRetencaoAction`, sem bloquear o SSR/paint da tabela
 * principal (d1_consolidado) que já veio pronta do Server Component pai.
 *
 * Metas: a geral vem do servidor (mesma da EquipeTable) e as por tema do
 * localStorage; as duas são editadas no "Configurações da Tabela" do topo da
 * página e chegam aqui pelo evento de metas-consolidado.ts.
 *
 * TODO: metas por tema ainda em localStorage — migrar pra
 * `gestor_config_fantasia` (precisa de coluna nova) pra valerem em qualquer
 * navegador.
 */
export function RetencaoDetalheSection({
  gestorId,
  metaInicial,
}: RetencaoDetalheSectionProps) {
  // Abre sempre no topo (ver use-topo-ao-carregar.ts).
  useTopoAoCarregar();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<{
    visaoGeral: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    porSegmento: SegmentoResult;
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    impactoFaceId: ImpactoFaceIdData;
    efetividadeArgumento: ArgumentoItem[];
    emailsEquipe: string[];
  } | null>(null);

  // Meta geral = a da EquipeTable (servidor); por tema = localStorage, lido
  // só depois do mount. Edição nos dois casos: "Configurações da Tabela".
  const [metaGlobal, setMetaGlobal] = useState(metaInicial);
  const [themeMetas, setThemeMetas] = useState<Record<string, number>>(DEFAULT_THEME_METAS);
  useEffect(() => {
    setThemeMetas(lerThemeMetas(gestorId));
  }, [gestorId]);
  useEffect(
    () =>
      onMetasAtualizadas((metas) => {
        setMetaGlobal(metas.metaGlobal);
        setThemeMetas(metas.themeMetas);
      }),
    [],
  );


  // Extraído do useEffect de mount pra poder ser reaproveitado também
  // quando o "Limpar Base" (GestorEquipeSection, árvore irmã) avisa que
  // retencao_atendimentos foi esvaziada — ver base-cleared-event.ts.
  const load = useCallback(async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardRetencaoAction();

      if (!activeRef.current) return;

      if (result.success && result.data) {
        setData({
          visaoGeral: result.data.visaoGeral,
          porTema: result.data.porTema,
          evolucaoHora: result.data.evolucaoHora,
          porSegmento: result.data.porSegmento,
          quartilOperadores: result.data.quartilOperadores,
          quartilPolo: result.data.quartilPolo,
          impactoFaceId: result.data.impactoFaceId,
          efetividadeArgumento: result.data.efetividadeArgumento,
          emailsEquipe: result.data.emailsEquipe,
        });
      } else {
        setError(result.error || "Erro ao carregar dados do dashboard.");
      }
    } catch (err) {
      if (!activeRef.current) return;
      setError("Erro inesperado ao carregar dados.");
      console.error(err);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRef = { current: true };
    load(activeRef);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  // Reage ao "Limpar Base" E ao upload de uma base nova (os dois disparam
  // notifyBaseAtualizada — ver comentário em base-cleared-event.ts)
  // refazendo a mesma busca — sem isso, esta seção ficaria mostrando dados
  // antigos de retencao_atendimentos até um F5 manual, mesmo com a
  // EquipeTable (d1_consolidado) já refletindo a base nova (ela reage
  // sozinha via polling de 30s, independente deste evento).
  useEffect(() => {
    const activeRef = { current: true };
    const unsubscribe = onBaseAtualizada(() => {
      load(activeRef);
    });
    return () => {
      activeRef.current = false;
      unsubscribe();
    };
  }, [load]);

  const hasNoData = !data || data.visaoGeral.total === 0;

  // Chave que força o ScrollTrigger a recalcular quando as metas mudam —
  // memorizada pra não refazer o JSON.stringify a cada render.
  const refreshKeyTrilho = useMemo(
    () => `${metaGlobal}-${JSON.stringify(themeMetas)}`,
    [metaGlobal, themeMetas],
  );

  // Avisa a sidebar de navegação (ConsolidadoNavSidebar) se os cards do
  // trilho existem — sem eles, os itens dela não têm pra onde rolar.
  const trilhoDisponivel = !loading && !error && !hasNoData;
  useEffect(() => {
    notifyTrilhoDisponivel(trilhoDisponivel);
  }, [trilhoDisponivel]);
  useEffect(() => () => notifyTrilhoDisponivel(false), []);

  // Extraído pra prop: no estado "pronto" (trilho horizontal), este
  // cabeçalho vai DENTRO da área pinada do ScrollTrigger (ver
  // RetencaoHorizontalScroll `header`), pra ficar visível durante todo o
  // scroll horizontal em vez de rolar pra fora de vista antes do pin
  // engatar. Nos outros estados (loading/erro/sem dados) continua
  // renderizado normalmente, fora do trilho.
  //
  // Simplificado: sem o label "Detalhamento Analítico" e sem repetir
  // gestora/"report às HH:MM" (já estão no cabeçalho da página).
  const cabecalho = <CabecalhoSecao titulo="Analítico" />;

  return (
    <section>
      {(loading || error || hasNoData) && cabecalho}

      {loading ? (
        // Skeleton no formato do primeiro bloco do trilho (cards da visão
        // geral + "Evolução da equipe") — em vez do spinner + "Carregando
        // dados analíticos...".
        <AnaliticoSkeleton />
      ) : error ? (
        // Erro: mesmo gráfico esqueleto parado do estado vazio (sem
        // container), com a mensagem em vermelho e botão pra tentar de novo
        // sem F5.
        <GraficoVazio
          titulo="Não foi possível carregar o Analítico"
          descricao={error}
          altura={350}
          erro
          acao={
            <button
              type="button"
              onClick={() => load({ current: true })}
              className="font-sans border-border text-foreground hover:bg-muted/40 inline-flex h-8 cursor-pointer items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Tentar novamente
            </button>
          }
        />
      ) : hasNoData ? (
        // Estado vazio ÚNICO pra todo o bloco Detalhamento Analítico —
        // substitui o trilho horizontal inteiro (todas as seções: visão
        // geral, temas, quartis, segmentos, contratos), então não precisa
        // de um vazio por seção separado. Antes mostrava uma lista de
        // operadores (emailsEquipe) que não fazia sentido sem dado nenhum
        // pra mostrar por operador. Agora: gráfico esqueleto parado, sem
        // container em volta, com a mensagem no centro (GraficoVazio).
        <GraficoVazio
          titulo="Aguardando dados do dia"
          descricao="Ainda não há atendimentos de retenção reportados hoje pra sua equipe."
          altura={350}
        />
      ) : (
        <div className="space-y-6">
          {/*
            Trilho horizontal (scroll-jacking via GSAP ScrollTrigger, ver
            retencao-horizontal-scroll.tsx): os 6 blocos analíticos viram
            "slides" de largura igual, pinados enquanto o usuário rola a
            página. Só ativo em telas >= lg — no mobile os slides seguem
            empilhados verticalmente (comportamento de antes da fusão).

            `refreshKey` muda quando metaGlobal/themeMetas mudam (o popover
            de metas pode alterar altura de linhas coloridas nas tabelas),
            forçando o ScrollTrigger a recalcular as distâncias de pin.
          */}
          <RetencaoHorizontalScroll
            header={cabecalho}
            refreshKey={refreshKeyTrilho}
            slides={[
              <div
                key="visao-geral-evolucao"
                className="flex flex-col gap-6"
              >
                {/* Cada card mantém 100% do visual/estilo próprio (StyledCard,
                    borda, fundo, padding) — só empilhados verticalmente dentro
                    do mesmo slot do trilho, não um card único reestilizado. */}
                <div data-visao-geral-cards>
                  <VisaoGeralCards data={data!.visaoGeral} meta={metaGlobal} semAnimacao />
                </div>
                {/* Mesmo visual/regras do "Evolução do polo" do /c, adaptado
                    pra equipe (operadores no "Quem derrubou nesta hora"). O
                    toggle "Acumulada" saiu. */}
                <EvolucaoEquipe
                  evolucao={data!.evolucaoHora}
                  meta={metaGlobal}
                  titulo="Evolução da equipe"
                  descricao="Pedidos, retidos e cancelados por hora, com a taxa da equipe em cada hora e o total do dia. Passe o mouse para ver quem derrubou a taxa em cada hora."
                />

              </div>,
              <TabelaTemas
                titulo="Taxa de retenção por tema"
                descricao="Clique num motivo para ver os submotivos e a taxa de cada tópico."
                key="temas"
                scrollInterno
                refinado
                temas={data!.porTema}
                metaGlobal={metaGlobal}
                themeMetas={themeMetas}
              />,
              <DistribuicaoQuartis
                key="quartis"
                operadores={data!.quartilOperadores}
                operadoresPolo={data!.quartilPolo}
                meta={metaGlobal}
              />,
              <TabelaSegmentos
                key="segmentos"
                segmentos={data!.porSegmento}
                meta={metaGlobal}
              />,
              <CopiarContratos
                key="copiar-contratos"
                emailsEquipe={data!.emailsEquipe}
                porTema={data!.porTema}
              />,
              <ImpactoFaceIdCard key="impacto-faceid" data={data!.impactoFaceId} />,
              // Assinatura DENTRO do último slide, só no desktop (lg:block):
              // aparece logo abaixo do último card e desliza junto com ele —
              // mesmo ajuste de /s/reports/tempo-indisponibilidade. O card
              // (scrollInterno) cede altura pra ela via min-h-0: se a tabela
              // for maior que o espaço, só ela rola por dentro.
              // Mobile (slides empilhados) usa a do fim da seção.
              <div key="efetividade-argumento" className="flex h-full flex-col">
                <div className="min-h-0">
                  <EfetividadeArgumentoCard argumentos={data!.efetividadeArgumento} />
                </div>
                <div className="mt-10 hidden shrink-0 lg:block">
                  <SignatureFooter />
                </div>
              </div>,
            ]}
          />
        </div>
      )}

      {/*
        Assinatura no fim da seção — mt-10 = o space-y-10 que a separava do
        Analítico em page.tsx. Com o trilho ativo, no desktop ela já aparece
        dentro do último slide (acima), então aqui fica só no mobile.
      */}
      <div className={loading || error || hasNoData ? "mt-10" : "mt-10 lg:hidden"}>
        <SignatureFooter />
      </div>
    </section>
  );
}
