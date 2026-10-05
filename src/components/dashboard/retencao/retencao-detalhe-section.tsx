"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { fetchDashboardRetencaoAction } from "@/lib/retencao/actions";
import { onBaseAtualizada } from "@/lib/retencao/base-cleared-event";
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
  // Ao (re)carregar a página, o navegador tenta restaurar a posição de
  // scroll anterior (ex.: estava no meio do trilho do Analítico) — some com
  // o cabeçalho e deixa a página abrindo "no meio". Desligamos a restauração
  // automática e forçamos o topo, só nesta rota.
  //
  // Um scrollTo(0,0) único (na montagem, ou de novo quando os dados client-
  // side chegam) não bastava: este componente busca os próprios dados
  // depois do mount (ver `load`, abaixo), então o documento cresce de
  // altura em mais de um momento enquanto carrega — e o navegador tenta
  // RESTAURAR a posição salva de novo a cada vez que a altura aumenta o
  // suficiente pra alcançá-la (comportamento nativo, assíncrono, sem um
  // gancho JS pra saber exatamente quando ele vai tentar). Corrigir só nos
  // momentos que a gente prevê (mount, `loading` virando false) sempre
  // deixava uma janela sem cobertura.
  //
  // Corrigido com uma "guarda" por alguns frames: a cada
  // requestAnimationFrame, se o scroll saiu de 0 sem o usuário ter mexido o
  // mouse/toque/teclado, volta pro topo e chama ScrollTrigger.update()
  // (recalcula só o PROGRESSO dos triggers contra o novo scroll — não usa
  // .refresh(), que remede layout de TODOS os ScrollTriggers da página e
  // reflowava até o painel de anexo ao lado da tabela). A guarda se
  // desliga sozinha no primeiro gesto real do usuário (wheel/touch/tecla)
  // ou depois de UNLOCK_MS, o que vier primeiro — nunca prende um scroll
  // manual do usuário. useLayoutEffect (não useEffect): a PRIMEIRA correção
  // roda antes do navegador pintar o frame inicial, sem flash.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const UNLOCK_MS = 2000;
    let active = true;
    let rafId = 0;

    const stop = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.clearTimeout(timeoutId);
    };

    const tick = () => {
      if (!active) return;
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
        ScrollTrigger.update();
      }
      rafId = requestAnimationFrame(tick);
    };

    window.scrollTo(0, 0);
    tick();

    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const timeoutId = window.setTimeout(stop, UNLOCK_MS);

    return () => {
      stop();
      window.history.scrollRestoration = previous;
    };
  }, []);

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

  // Extraído pra prop: no estado "pronto" (trilho horizontal), este
  // cabeçalho vai DENTRO da área pinada do ScrollTrigger (ver
  // RetencaoHorizontalScroll `header`), pra ficar visível durante todo o
  // scroll horizontal em vez de rolar pra fora de vista antes do pin
  // engatar. Nos outros estados (loading/erro/sem dados) continua
  // renderizado normalmente, fora do trilho.
  //
  // Simplificado: removido o label "Detalhamento Analítico" e a repetição
  // de gestora/"report às HH:MM" — essa informação já aparece no
  // cabeçalho da EquipeTable logo acima ("Equipe - O supervisor [nome] fez
  // um report às HH:MM"), repetir aqui era redundante. Divisória tracejada
  // removida a pedido (linhas pontilhadas tiradas de toda a página
  // reports/consolidado).
  // CAUSA do espaçamento sumindo só no estado "com dados": o gap ABAIXO da
  // divisória vinha do `space-y-6` do <section> pai — que só funciona
  // quando `cabecalho` é filho DIRETO dele (caminhos loading/error/vazio,
  // linha abaixo). No caminho "com dados", `cabecalho` é passado como prop
  // `header` pro RetencaoHorizontalScroll e renderizado DENTRO da área
  // pinada do trilho — não é mais filho do <section>, então o `space-y-6`
  // nunca chegava a aplicar. Corrigido tirando essa dependência do pai:
  // `mb-6` agora mora no PRÓPRIO header, funcionando igual nos dois lugares
  // onde `cabecalho` é usado.
  const cabecalho = (
    <header className="pt-2 pb-4 mb-6 flex items-center gap-4">
      <h2 className="font-sans shrink-0 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        Analítico
      </h2>
      {/* Divisória ao lado do título: um traço curto em cima e um longo
          embaixo, indo até a borda direita, na cor do texto do report
          (muted-foreground) a 55%: o traço sólido de 2px na cor cheia parecia
          bem mais claro que as letras finas do texto. Linhas sólidas (pontilhadas
          foram removidas da página a pedido). */}
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="block h-0.5 w-24 bg-muted-foreground/55" />
        <span className="block h-0.5 w-full bg-muted-foreground/55" />
      </div>
    </header>
  );

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
            refreshKey={`${metaGlobal}-${JSON.stringify(themeMetas)}`}
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
