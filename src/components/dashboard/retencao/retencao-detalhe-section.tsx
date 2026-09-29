"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { fetchDashboardRetencaoAction, fetchEvolucaoAcumuladaAction } from "@/lib/retencao/actions";
import type { FaixaAcumuladaData } from "@/lib/retencao/get-evolucao-acumulada";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { LabeledSwitch } from "@/components/gestor/labeled-switch";
import { GraficoEvolucaoAcumulada } from "./grafico-evolucao-acumulada";
import { onBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import { StyledCard } from "@/components/gestor/styled-card";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import type { SegmentoResult } from "@/lib/retencao/get-por-segmento";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import type { MatrizResult } from "@/lib/retencao/get-matriz-volume-taxa";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import type { ImpactoFaceIdData } from "@/lib/retencao/get-impacto-faceid";
import type { ArgumentoItem } from "@/lib/retencao/get-efetividade-argumento";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { VisaoGeralCards } from "./visao-geral-cards";
import { GraficoEvolucao } from "./grafico-evolucao";
import { TabelaTemas } from "./tabela-temas";
import { TabelaSegmentos } from "./tabela-segmentos";
import { DistribuicaoQuartis } from "./distribuicao-quartis";
import { CopiarContratos } from "./copiar-contratos";
import { ImpactoFaceIdCard } from "./impacto-faceid-card";
import { EfetividadeArgumentoCard } from "./efetividade-argumento-card";
import { ConfigMetasPopover } from "./config-metas-popover";
import { RetencaoHorizontalScroll } from "./retencao-horizontal-scroll";

/** Duração mínima do skeleton ao ligar/desligar o toggle "Acumulada". */
const TROCA_VISAO_MS = 3_000;

/** Alturas (%) das barras do skeleton — fixas pra não mudar a cada render. */
const SKELETON_BARRAS = [18, 42, 55, 70, 78, 64, 72, 50, 58, 74, 80, 46, 28, 12];

/**
 * Tom dos blocos do skeleton: o mesmo cinza das barras do gráfico
 * (--muted-foreground a 14%). bg-card não serve aqui — na Vercel clara é
 * branco puro sobre fundo quase branco, os blocos sumiam.
 */
const SKELETON_BLOCO = "bg-[color-mix(in_oklab,var(--muted-foreground)_14%,transparent)]";

/**
 * Skeleton do bloco "Evolução da equipe" (título, descrição, legenda e
 * gráfico) durante a troca por hora ↔ acumulada. Blocos no formato do
 * conteúdo real + pulso suave; mesmas alturas do bloco real pra não pular o layout. Os controles
 * (toggle + engrenagem) continuam reais e clicáveis.
 */
function EvolucaoSkeleton({ acoes }: { acoes: ReactNode }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando gráfico">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 animate-pulse space-y-2 motion-reduce:animate-none">
          <div className={`${SKELETON_BLOCO} h-6 w-44 rounded-md`} />
          <div className={`${SKELETON_BLOCO} h-4 w-full max-w-[520px] rounded-md`} />
        </div>
        <div className="shrink-0">{acoes}</div>
      </div>
      <div className="flex animate-pulse flex-wrap gap-x-5 gap-y-1.5 motion-reduce:animate-none">
        {[112, 76, 150, 190].map((w) => (
          <div key={w} className={`${SKELETON_BLOCO} h-3.5 rounded`} style={{ width: w }} />
        ))}
      </div>
      <div className="flex h-[320px] animate-pulse items-end gap-2 px-8 pb-6 motion-reduce:animate-none">
        {SKELETON_BARRAS.map((h, i) => (
          <div key={i} className={`${SKELETON_BLOCO} flex-1 rounded-t-[4px]`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton do carregamento inicial do Analítico (F5 / primeira vez que a
 * seção entra na tela): cards da visão geral (Taxa de Retenção grande +
 * Pedidos/Retidos/Churn) com o mesmo grid e caixas do VisaoGeralCards, e o
 * EvolucaoSkeleton embaixo — no lugar dos controles do gráfico (ainda sem
 * dados), blocos no formato do toggle e da engrenagem.
 */
function AnaliticoSkeleton() {
  const caixa = "rounded-lg border border-border bg-card/70 shadow-[var(--shadow-sm)]";
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando dados analíticos">
      <div className="grid animate-pulse grid-cols-1 gap-4 motion-reduce:animate-none sm:grid-cols-5 sm:items-end">
        <div className={`${caixa} flex flex-col gap-3 p-6 sm:col-span-2`}>
          <div className={`${SKELETON_BLOCO} h-3.5 w-36 rounded`} />
          <div className={`${SKELETON_BLOCO} h-12 w-40 rounded-md`} />
        </div>
        <div className="grid grid-cols-3 gap-4 sm:col-span-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${caixa} flex flex-col gap-3 p-4`}>
              <div className={`${SKELETON_BLOCO} h-3.5 w-16 rounded`} />
              <div className={`${SKELETON_BLOCO} h-8 w-14 rounded-md`} />
            </div>
          ))}
        </div>
      </div>
      <EvolucaoSkeleton
        acoes={
          <div className="flex animate-pulse items-center gap-3 motion-reduce:animate-none">
            <div className={`${SKELETON_BLOCO} h-[18px] w-24 rounded-full`} />
            <div className={`${SKELETON_BLOCO} h-8 w-8 rounded-md`} />
          </div>
        }
      />
    </div>
  );
}

interface RetencaoDetalheSectionProps {
  emailsEquipeIniciais: string[];
  /** profiles.id do gestor logado — chave de escopo das metas salvas localmente (ver TODO abaixo). */
  gestorId: string;
  gestora?: string;
  reportHoraInicial?: string | null;
}

/**
 * Seção de detalhamento analítico (temas, evolução por hora, segmentos,
 * quartis, operadores) exibida dentro de /reports/consolidado, abaixo da
 * EquipeTable. Busca os próprios dados client-side (retencao_atendimentos)
 * via `fetchDashboardRetencaoAction`, sem bloquear o SSR/paint da tabela
 * principal (d1_consolidado) que já veio pronta do Server Component pai.
 *
 * TODO: metaGlobal/themeMetas ainda são persistidas em localStorage
 * (escopadas por gestorId). O padrão do resto da página (olho, ordem da
 * tabela, RV diário) já usa `gestor_config_fantasia` via server actions —
 * migrar estas metas para lá também, para não conviver dois mecanismos de
 * persistência de preferência na mesma página.
 */
export function RetencaoDetalheSection({
  emailsEquipeIniciais,
  gestorId,
  gestora = "Equipe",
  reportHoraInicial,
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
  const [emailsEquipe, setEmailsEquipe] = useState<string[]>(emailsEquipeIniciais);

  const [data, setData] = useState<{
    visaoGeral: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    porSegmento: SegmentoResult;
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    matriz: MatrizResult;
    operadoresIndividual: OperadorIndividual[];
    quartilPorOperador: Record<string, QuartilOperador>;
    impactoFaceId: ImpactoFaceIdData;
    efetividadeArgumento: ArgumentoItem[];
    nomeFantasia: NomeFantasiaSerial;
    meta: number;
  } | null>(null);

  // Metas configuradas localmente
  // Espelha o open/close do ConfigMetasPopover só pra elevar o gráfico acima
  // do overlay de blur (z-40) enquanto o popover está aberto.
  const [configMetasOpen, setConfigMetasOpen] = useState(false);

  // Toggle "Acumulada" do gráfico "Evolução da equipe": troca a visão por
  // hora pela taxa acumulada em faixas de 30 min. Os dados vêm de uma busca
  // própria (fetchEvolucaoAcumuladaAction), feita só quando o toggle está
  // ligado — refeita sempre que os dados da seção recarregam (base nova ou
  // "Limpar Base"), pra não mostrar acumulado de uma base antiga.
  const [acumuladaAtiva, setAcumuladaAtiva] = useState(false);
  // Skeleton de TROCA_VISAO_MS a cada liga/desliga do toggle (regra fixa,
  // mesmo que os dados já estejam prontos). Religar/desligar no meio
  // reinicia a contagem.
  const [trocandoVisao, setTrocandoVisao] = useState(false);
  const trocaTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(trocaTimerRef.current), []);
  function handleToggleAcumulada(ativa: boolean) {
    setAcumuladaAtiva(ativa);
    setTrocandoVisao(true);
    window.clearTimeout(trocaTimerRef.current);
    trocaTimerRef.current = window.setTimeout(() => setTrocandoVisao(false), TROCA_VISAO_MS);
  }
  const [acumulada, setAcumulada] = useState<FaixaAcumuladaData[] | null>(null);

  const [metaGlobal, setMetaGlobal] = useState<number>(65);
  const [themeMetas, setThemeMetas] = useState<Record<string, number>>({
    "Mot. Financeiro": 80,
    "Ins. Atendimento": 80,
    "Ins. Serviço": 80,
    "Mud. Endereço": 60,
    "Mud. Provedora": 60,
    "Outros": 60,
  });

  // Carrega configurações salvas no localStorage (escopadas por gestorId)
  useEffect(() => {
    if (!gestorId) return;
    const globalKey = `retencao_meta_global_${gestorId}`;
    const savedGlobal = localStorage.getItem(globalKey);
    if (savedGlobal) {
      setMetaGlobal(Number(savedGlobal));
    } else {
      setMetaGlobal(65);
    }
  }, [gestorId]);

  useEffect(() => {
    if (!gestorId) return;
    const themesKey = `retencao_meta_temas_${gestorId}`;
    const savedThemes = localStorage.getItem(themesKey);
    if (savedThemes) {
      try {
        const parsed = JSON.parse(savedThemes);
        setThemeMetas({
          "Mot. Financeiro": 80,
          "Ins. Atendimento": 80,
          "Ins. Serviço": 80,
          "Mud. Endereço": 60,
          "Mud. Provedora": 60,
          "Outros": 60,
          ...parsed,
        });
      } catch (e) {
        console.error("Erro ao parsear metas do localStorage:", e);
      }
    } else {
      setThemeMetas({
        "Mot. Financeiro": 80,
        "Ins. Atendimento": 80,
        "Ins. Serviço": 80,
        "Mud. Endereço": 60,
        "Mud. Provedora": 60,
        "Outros": 60,
      });
    }
  }, [gestorId]);

  const handleSaveMetas = (newGlobal: number, newThemes: Record<string, number>) => {
    if (!gestorId) return;
    setMetaGlobal(newGlobal);
    setThemeMetas(newThemes);
    const globalKey = `retencao_meta_global_${gestorId}`;
    const themesKey = `retencao_meta_temas_${gestorId}`;
    localStorage.setItem(globalKey, String(newGlobal));
    localStorage.setItem(themesKey, JSON.stringify(newThemes));
    toast.success("Metas salvas com sucesso!", { className: "reports-consolidado-toast" });
  };

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
          matriz: result.data.matriz,
          operadoresIndividual: result.data.operadoresIndividual,
          quartilPorOperador: result.data.quartilPorOperador,
          impactoFaceId: result.data.impactoFaceId,
          efetividadeArgumento: result.data.efetividadeArgumento,
          nomeFantasia: result.data.nomeFantasia,
          meta: result.data.meta,
        });
        setEmailsEquipe(result.data.emailsEquipe);
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

  useEffect(() => {
    if (!acumuladaAtiva || !data) return;
    let ativo = true;
    setAcumulada(null);
    fetchEvolucaoAcumuladaAction()
      .then((result) => {
        if (!ativo) return;
        if (result.success) {
          setAcumulada(result.data);
        } else {
          toast.error(result.error, { className: "reports-consolidado-toast" });
          setAcumuladaAtiva(false);
        }
      })
      .catch((err) => {
        if (!ativo || handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao carregar a evolução acumulada.", {
          className: "reports-consolidado-toast",
        });
        setAcumuladaAtiva(false);
      });
    return () => {
      ativo = false;
    };
  }, [acumuladaAtiva, data]);

  const hasNoData = !data || data.visaoGeral.total === 0;

  // Controles à direita do título do gráfico: toggle da visão acumulada ao
  // lado da engrenagem de metas (mesmo LabeledSwitch do "Exibir RV").
  const acoesEvolucao = (
    <div className="flex items-center gap-3">
      <LabeledSwitch label="Acumulada" checked={acumuladaAtiva} onCheckedChange={handleToggleAcumulada} />
      <ConfigMetasPopover
        metaGlobal={metaGlobal}
        themeMetas={themeMetas}
        onSave={handleSaveMetas}
        onOpenChange={setConfigMetasOpen}
      />
    </div>
  );

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
    <header className="pt-2 pb-4 mb-6">
      <h2 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Analítico
      </h2>
    </header>
  );

  return (
    <section>
      {(loading || error || hasNoData) && cabecalho}

      {loading ? (
        // Skeleton no formato do primeiro bloco do trilho (cards da visão
        // geral + "Evolução da equipe"), mesmo visual da troca do toggle
        // "Acumulada" — em vez do spinner + "Carregando dados analíticos...".
        <AnaliticoSkeleton />
      ) : error ? (
        <div className="elevation-1 bg-card border border-border/60 rounded-xl p-8 text-center min-h-[250px] flex flex-col items-center justify-center">
          <p className="ds-body text-danger font-medium">{error}</p>
        </div>
      ) : hasNoData ? (
        // Estado vazio ÚNICO pra todo o bloco Detalhamento Analítico —
        // substitui o trilho horizontal inteiro (todas as seções: visão
        // geral, temas, quartis, segmentos, contratos), então não precisa
        // de um vazio por seção separado. Antes mostrava uma lista de
        // operadores (emailsEquipe) que não fazia sentido sem dado nenhum
        // pra mostrar por operador — trocado por um placeholder mais
        // minimalista, na mesma linguagem visual do site (StyledCard com
        // cantoneiras, mono, tokens de cor), sem lista nenhuma.
        <StyledCard
          withGradient
          className="flex min-h-[350px] flex-col items-center justify-center gap-5 p-10 text-center"
        >
          {/*
            Placeholder de gráfico de barras esmaecido + "?" sobreposto —
            CSS puro, sem ilustração externa. Sugere o FORMATO que os dados
            teriam (tipo o gráfico de evolução), sem fingir ser um gráfico
            real.
          */}
          <div className="relative flex h-16 items-end gap-2" aria-hidden="true">
            {[35, 60, 25, 75, 45, 55].map((altura, idx) => (
              <div
                key={idx}
                className="bg-muted-foreground/15 w-3 rounded-t-sm"
                style={{ height: `${altura}%` }}
              />
            ))}
            <span className="ds-display text-muted-foreground/40 absolute inset-0 flex items-center justify-center text-3xl font-bold">
              ?
            </span>
          </div>

          <div className="max-w-sm space-y-1.5">
            <h3 className="ds-h3 text-foreground font-semibold">Aguardando dados do dia</h3>
            <p className="ds-body text-muted-foreground text-sm">
              Ainda não há atendimentos de retenção reportados hoje pra sua equipe.
            </p>
          </div>
        </StyledCard>
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
                // bg-background junto com o z-50: sem fundo próprio, o gráfico
                // (acima do overlay) mostrava o blur por trás — mesma correção
                // da tabela com o "Configurações da Tabela" aberto.
                className={`flex flex-col gap-6 ${configMetasOpen ? "relative z-50 bg-background" : ""}`}
              >
                {/* Cada card mantém 100% do visual/estilo próprio (StyledCard,
                    borda, fundo, padding) — só empilhados verticalmente dentro
                    do mesmo slot do trilho, não um card único reestilizado. */}
                <div data-visao-geral-cards>
                  <VisaoGeralCards data={data!.visaoGeral} meta={metaGlobal} semAnimacao />
                </div>
                {trocandoVisao || (acumuladaAtiva && !acumulada) ? (
                  // Skeleton da troca por hora ↔ acumulada: fica no mínimo
                  // TROCA_VISAO_MS e, na acumulada, até a busca terminar.
                  <EvolucaoSkeleton acoes={acoesEvolucao} />
                ) : acumuladaAtiva && acumulada ? (
                  <GraficoEvolucaoAcumulada
                    dados={acumulada}
                    meta={metaGlobal}
                    titulo="Evolução da equipe"
                    descricao="Taxa de retenção acumulada ao longo do dia, a cada 30 minutos. Cada ponto soma todos os pedidos desde o início do dia até o fim da faixa."
                    acoes={acoesEvolucao}
                  />
                ) : (
                  <GraficoEvolucao
                    dados={data!.evolucaoHora}
                    meta={metaGlobal}
                    titulo="Evolução da equipe"
                    descricao="Taxa de retenção e volume de atendimentos ao longo do dia. Cada hora representa o intervalo completo (ex.: 09h = 09:00 às 09:59)."
                    visualDetalhado
                    acoes={acoesEvolucao}
                  />
                )}
              </div>,
              <TabelaTemas
                titulo="Taxa de retenção por tema"
                descricao="Clique num motivo para ver os submotivos e a taxa de cada tópico."
                key="temas"
                scrollInterno
                temas={data!.porTema}
                metaGlobal={metaGlobal}
                themeMetas={themeMetas}
              />,
              <DistribuicaoQuartis
                key="quartis"
                scrollInterno
                operadores={data!.quartilOperadores}
                operadoresPolo={data!.quartilPolo}
                meta={metaGlobal}
              />,
              <TabelaSegmentos
                key="segmentos"
                scrollInterno
                segmentos={data!.porSegmento}
                meta={metaGlobal}
              />,
              <CopiarContratos
                key="copiar-contratos"
                scrollInterno
                emailsEquipe={emailsEquipe}
                porTema={data!.porTema}
                operadoresIndividual={data!.operadoresIndividual}
              />,
              <ImpactoFaceIdCard key="impacto-faceid" scrollInterno data={data!.impactoFaceId} />,
              <EfetividadeArgumentoCard
                key="efetividade-argumento"
                scrollInterno
                argumentos={data!.efetividadeArgumento}
              />,
            ]}
          />
        </div>
      )}
    </section>
  );
}
