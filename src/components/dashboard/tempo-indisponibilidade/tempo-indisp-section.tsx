"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { AguardandoDadosCard } from "@/components/gestor/aguardando-dados-card";
import { TempoIndispSkeleton } from "@/app/(dashboard)/s/reports/tempo-indisponibilidade/loading";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
} from "@/lib/d1-db/calcular-aderencia";
import { clearTempoLogadoAction } from "@/lib/d1-db/actions/clear-tempo-logado-action";
import { refreshIndisponibilidadeAction } from "@/lib/d1-db/actions/refresh-indisponibilidade-action";
import { refreshTempoLogadoAction } from "@/lib/d1-db/actions/refresh-tempo-logado-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { ordenarOperadoresTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/ordenar-operadores-tempo-indisp";
import type { OrdemTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/types";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { cn } from "@/lib/utils";

import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";

import { AderenciaAnalitico } from "./aderencia-analitico";
import { CardsResumoAnalitico } from "./cards-resumo-analitico";
import { ConfigTabelaTempoIndispPopover } from "./config-tabela-tempo-indisp-popover";
import { CopyTempoIndispButton } from "./copy-tempo-indisp-button";
import { EstouroPausaAnalitico } from "./estouro-pausa-analitico";
import { mergeOperadoresTempoIndisp, type OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { OperadorAnaliticoDialog } from "./operador-analitico-dialog";
import { PausasDetalhadasAnalitico } from "./pausas-detalhadas-analitico";
import { PausasNaoRealizadasAnalitico } from "./pausas-nao-realizadas-analitico";
import { TempoIndispTabela } from "./tempo-indisp-tabela";

// Texto da 2ª linha do cabeçalho ("{nome} fez um report às {hora}") — MESMA
// lógica/formato de formatCabecalhoReport em gestor-equipe-section.tsx
// (/s/reports/consolidado), duplicada aqui (não extraída pra um util
// compartilhado) só pra não mexer no arquivo do consolidado. Diferente de
// formatReportLabel (@/lib/gestor/format-report-label), que ainda é usada
// pelas outras 2 tabelas do painel do gestor (TMA) com o texto mais longo
// ("O supervisor ... fez ...").
// Sem report ainda (hora nula/zerada): retorna null e a linha inteira some.
function formatCabecalhoReport(
  hora: string | null | undefined,
  nomeSupervisor: string | null | undefined,
): string | null {
  if (!hora || hora === "—" || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const nome = nomeSupervisor?.trim();
  if (nome) {
    return `${nome} fez um report às ${horaCurta}`;
  }
  return `Atualizado às ${horaCurta}`;
}

const MIN_REFRESH_LOADING_MS = 3_000;

interface TempoIndispSectionProps {
  operadoresTempoLogadoIniciais: GestorTempoLogadoLinha[];
  operadoresIndisponibilidadeIniciais: GestorIndispLinha[];
  horaReportInicial: string | null;
  nomeSupervisorReportInicial?: string | null;
  pausasProgramadas: PausaProgramadaDb[];
  toleranciaMin: number;
  /** Mostra a área de upload/limpeza da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  metaIndisponibilidadeInicial: number;
  ordemTabelaInicial: OrdemTabelaTempoIndisp;
}

export function TempoIndispSection({
  operadoresTempoLogadoIniciais,
  operadoresIndisponibilidadeIniciais,
  horaReportInicial,
  nomeSupervisorReportInicial = null,
  pausasProgramadas,
  toleranciaMin,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  metaIndisponibilidadeInicial,
  ordemTabelaInicial,
}: TempoIndispSectionProps) {
  // Ao (re)carregar a página, o navegador tenta restaurar a posição de
  // scroll anterior (ex.: estava no meio do trilho do Analítico) — some com
  // o cabeçalho e deixa a página abrindo "no meio". Desligamos a restauração
  // automática e forçamos o topo, só nesta rota (mesmo ajuste de
  // /s/reports/consolidado).
  //
  // Um scrollTo(0,0) único na montagem não bastava: o navegador pode tentar
  // RESTAURAR a posição salva mais de uma vez enquanto o layout da página
  // ainda está se ajustando (fontes, imagens, ScrollTrigger recalculando o
  // pin) — comportamento nativo, assíncrono, sem um gancho JS pra saber
  // exatamente quando ele vai tentar de novo.
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

  const [operadoresTL, setOperadoresTL] = useState(operadoresTempoLogadoIniciais);
  const [operadoresIndisp, setOperadoresIndisp] = useState(operadoresIndisponibilidadeIniciais);
  // Antes eram só props (do SSR de page.tsx), nunca atualizadas pelo
  // polling de 30s — buildForecastPorOperador/calcularAderenciaOperador
  // (usados pela Aderência e pelos cards analíticos novos) ficavam presos
  // no valor do primeiro carregamento da página. Viram state, atualizado
  // em refetch() (abaixo) — reaproveita o MESMO polling já existente, sem
  // criar nenhum setInterval novo.
  const [pausasProgramadasState, setPausasProgramadas] = useState(pausasProgramadas);
  const [toleranciaMinState, setToleranciaMin] = useState(toleranciaMin);
  const [horaReport, setHoraReport] = useState(horaReportInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(nomeSupervisorReportInicial);
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [metaIndisponibilidade, setMetaIndisponibilidade] = useState(metaIndisponibilidadeInicial);
  const [ordemTabela, setOrdemTabela] = useState<OrdemTabelaTempoIndisp>(ordemTabelaInicial);
  // Espelha o open/close do ConfigTabelaTempoIndispPopover só pra elevar a
  // tabela acima do overlay de blur (z-40) enquanto o popover está aberto —
  // mesmo padrão de configPopoverOpen em GestorEquipeSection.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selecionado, setSelecionado] = useState<OperadorAnaliticoTempoIndisp | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("tempo_indisponibilidade", novoValor);
  }

  // Sem polling automático nesta página (removido — só o Consolidado
  // continua reconsultando sozinho a cada 30s; ver comentário em
  // gestor-equipe-section.tsx). `refetch` continua existindo como gatilho
  // MANUAL, disparado só por ação explícita do gestor: ClearBaseButton e o
  // popover de meta/ordenação (onSaved). `metaOverride` existe só pro
  // chamado logo após salvar uma meta nova na engrenagem: nesse ponto o
  // state `metaIndisponibilidade` ainda não reflete o valor novo (setState
  // é assíncrono) — passar o valor recém-salvo direto evita esse 1 render
  // de atraso. Sem polling, não há mais risco de closure obsoleta presa num
  // `useEffect(..., [])`, então `refetch` lê `metaIndisponibilidade` direto
  // do state (sem ref).
  async function refetch(metaOverride?: number) {
    const [tlResult, indispResult] = await Promise.all([
      refreshTempoLogadoAction(),
      refreshIndisponibilidadeAction(metaOverride ?? metaIndisponibilidade),
    ]);
    if (tlResult.success) {
      setOperadoresTL(tlResult.operadores);
      setHoraReport(tlResult.horaReport);
      setNomeSupervisorReport(tlResult.nomeSupervisorReport);
    }
    if (indispResult.success) {
      setOperadoresIndisp(indispResult.operadores);
      setPausasProgramadas(indispResult.pausasProgramadas);
      setToleranciaMin(indispResult.toleranciaMin);
    }
  }

  async function handleBaseCleared() {
    const inicio = Date.now();
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      const faltam = MIN_REFRESH_LOADING_MS - (Date.now() - inicio);
      if (faltam > 0) {
        await new Promise((resolve) => setTimeout(resolve, faltam));
      }
      setIsRefreshing(false);
    }
  }

  const operadoresMergedBrutos = mergeOperadoresTempoIndisp(operadoresTL, operadoresIndisp);
  const operadoresMerged = ordenarOperadoresTempoIndisp(operadoresMergedBrutos, ordemTabela);

  const hasDados = operadoresMerged.some(
    (op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null,
  );

  // Sobra de rolagem no fim da página (desktop): o trilho do Analítico tem
  // a altura do MAIOR slide (dynamicHeight) e, pinado em top:60px, pode
  // passar do fim da tela — depois que o pin solta, a página ainda rolava
  // esse excesso + as margens/padding de baixo, só mostrando espaço vazio
  // (o último card e a assinatura já estavam visíveis). No consolidado o
  // trilho tem altura fixa e a página termina antes do pin soltar.
  // Aqui mede quanto a rolagem máxima passa do fim do pin e recolhe essa
  // diferença com margin-bottom negativo + overflow clip no bloco pai (ver
  // o JSX) — a página termina exatamente
  // quando o trilho acaba. Recalcula a cada refresh do ScrollTrigger
  // (altura do trilho mudou) e no resize. Mobile (sem pin): nada muda.
  const [recuoFinal, setRecuoFinal] = useState(0);
  useEffect(() => {
    let atual = 0;
    const aplicar = (novo: number) => {
      if (novo !== atual) {
        atual = novo;
        setRecuoFinal(novo);
      }
    };
    const medir = () => {
      const spacer = document.getElementById("trilho-card-0")?.closest<HTMLElement>(".pin-spacer");
      if (!hasDados || !spacer || !window.matchMedia("(min-width: 1024px)").matches) {
        aplicar(0);
        return;
      }
      // 60 = start do pin (top 60px, abaixo do header fixo — mesmo valor de
      // HEADER_HEIGHT_PX em retencao-horizontal-scroll.tsx).
      const fimDoPin =
        spacer.getBoundingClientRect().top + window.scrollY - 60 + parseFloat(getComputedStyle(spacer).paddingBottom);
      const rolagemMax = document.documentElement.scrollHeight - window.innerHeight;
      aplicar(Math.max(0, Math.round(rolagemMax + atual - fimDoPin)));
    };
    ScrollTrigger.addEventListener("refresh", medir);
    window.addEventListener("resize", medir);
    medir();
    return () => {
      ScrollTrigger.removeEventListener("refresh", medir);
      window.removeEventListener("resize", medir);
    };
  }, [hasDados]);

  const forecastPorOperador = useMemo(
    () => buildForecastPorOperador(pausasProgramadasState),
    [pausasProgramadasState],
  );

  function abrirDialog(op: OperadorAnaliticoTempoIndisp) {
    setSelecionado(op);
    setDialogOpen(true);
  }

  const aderenciaSelecionado = selecionado
    ? calcularAderenciaOperador(
        selecionado.email,
        {
          login: selecionado.horaLogin,
          pausa10Primeira: selecionado.pausa10PrimeiraHora,
          pausa20: selecionado.pausa20Hora,
          pausa10Segunda: selecionado.pausa10SegundaHora,
        },
        forecastPorOperador,
        toleranciaMinState,
      )
    : { forecast: null, items: [], percentualTotal: null };

  return (
    <>
      {/*
        Overlay de refresh manual — mesmo ajuste de /s/reports/consolidado:
        cobre só a área de CONTEÚDO (abaixo do header de 60px, à direita da
        sidebar de 240px em telas lg+), não a página inteira. Cobrir tudo
        escondia a sidebar durante o refresh, diferente de um F5 normal
        (loading.tsx do Next só substitui {children} dentro de <main>).
        Esqueleto = o MESMO do F5 (TempoIndispSkeleton, de loading.tsx), no
        lugar do KpiLoadingScreen antigo — mesmo ajuste do Consolidado.
      */}
      {isRefreshing && (
        // overflow-hidden: o esqueleto (min-h-screen) passa da área visível —
        // corta em vez de abrir rolagem dentro do overlay.
        // !mb-0: mesma proteção do overlay do Consolidado — se este elemento
        // cair dentro de um `space-y-*`, a margem inferior encurtaria o
        // overlay fixed e deixaria uma faixa da página real à mostra.
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mb-0 overflow-hidden lg:left-[240px]">
          <TempoIndispSkeleton />
        </div>
      )}

      {/*
        Cabeçalho (título "Tempo Logado & Indisponibilidade" + linha de
        report + controles) — MESMO padrão de GestorEquipeSection no
        consolidado: título, subtítulo com pt-3 e controles em uma linha
        própria logo abaixo com pt-4, todos alinhados à esquerda. Sem
        eyebrow, sem breadcrumb e sem o antigo
        título de seção "Equipe" com divisória tracejada por baixo (removido
        aqui: informação redundante, a navegação lateral já indica que é a
        tabela de Equipe). Fica FORA do motion.section abaixo (não anima
        fade/slide) — igual ao comportamento anterior, em que este cabeçalho
        vinha estático de page.tsx (Server Component); só migrou pra cá
        porque agora depende de estado client (horaReport/nomeSupervisorReport,
        atualizados por refetch() após Limpar Base ou salvar a meta).
        Ordem dos controles, igual ao consolidado: [⚙ Config] [🗑 Limpar
        base] [Copiar imagem] — sem toggle "Exibir RV" (não existe
        equivalente nesta tabela).
      */}
      {/* id: alvo do item "Tabela operadores" da barra lateral — mesmo ponto
          de chegada do Consolidado (#equipe-section, que começa no título). */}
      <div id="tempo-indisp-cabecalho">
        <div className="pt-4">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Tempo Logado &amp; Indisponibilidade
          </h1>

          {formatCabecalhoReport(horaReport, nomeSupervisorReport) && (
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {formatCabecalhoReport(horaReport, nomeSupervisorReport)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
          <ConfigTabelaTempoIndispPopover
            metaIndisponibilidadeInicial={metaIndisponibilidade}
            ordemInicial={ordemTabela}
            onSaved={(meta, ordem) => {
              setMetaIndisponibilidade(meta);
              setOrdemTabela(ordem);
              // Refetch imediato com a meta recém-salva (metaOverride):
              // cumpriuMeta é recalculado no servidor
              // (get-gestor-indisponibilidade.ts), não no client — sem
              // isso, a cor da linha/o card "dentro da meta" só
              // refletiriam a meta nova no próximo poll de 30s.
              void refetch(meta);
            }}
            onOpenChange={setConfigPopoverOpen}
          />

          {showUpload && (
            <ClearBaseButton
              action={clearTempoLogadoAction}
              onCleared={handleBaseCleared}
              toastClassName="reports-tempo-indisp-toast"
              showSuccessToast={false}
            />
          )}

          <CopyTempoIndispButton horaReport={horaReport ?? "—"} />
        </div>
      </div>

      {/*
        initial={false}: mesmo motivo de GestorEquipeSection
        (gestor-equipe-section.tsx, /s/reports/consolidado) — esta seção já vem
        pronta via SSR (props, sem fetch client próprio). Animar de
        opacity:0/y:12 com delay fazia a tabela "subir" na tela DEPOIS do
        loading.tsx sumir (motion renderiza o estado `initial` no SSR; só
        anima pra `animate` depois que o JS hidrata) — uma segunda animação
        de entrada emendada na do loading. `initial={false}` monta direto no
        estado final (opacity:1, y:0), sem essa animação extra — mantém
        motion.section (em vez de <section>) só pra não precisar tocar em
        mais nada da árvore.
      */}
      <motion.section
        id="tempo-indisp-section"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
      <div>
        {/*
          Sem divisória/borda tracejada aqui de propósito (removida nesta
          rodada, mesmo padrão do consolidado) — o espaço entre a linha de
          controles e o card de anexo/tabela agora é só o gap vertical
          (pb-2 da linha de controles acima + pt-2 daqui), igual ao respiro
          entre título e controles no cabeçalho logo acima.
        */}
          {/*
            overflowY clip só com recuoFinal ativo: o margin-bottom negativo
            (abaixo) encurta ESTE bloco, e o clip corta a sobra do pin-spacer
            (a parte vazia do trilho abaixo do último card) — sem ele, o
            spacer transbordava e a página continuava contando essa altura.
            `clip` não cria container de rolagem (sticky continua funcionando)
            e não corta o trilho enquanto pinado (position: fixed).
          */}
          <div
            className="flex flex-col gap-4 pt-2"
            style={recuoFinal ? { overflowY: "clip" } : undefined}
          >
            {/*
              Anexo horizontal — somente o dropzone, sem StyledCard externo e
              sem título próprio. Ocupa toda a largura da coluna, alinhado à
              tabela abaixo, e continua sempre visível quando showUpload.
            */}
          {showUpload && <UploadTempoLogadoDropzone abrirEmDownloads />}

          {/*
            space-y-10: mesma distância entre a tabela e o título "Analítico"
            do consolidado (page.tsx de lá: <div className="space-y-10">
            entre GestorEquipeSection e RetencaoDetalheSection).
          */}
          <div className="space-y-10" style={recuoFinal ? { marginBottom: -recuoFinal } : undefined}>
            {/*
              Tabela unificada SEMPRE visível — MESMO padrão de EquipeTable
              no consolidado: o roster inteiro aparece sempre, cada
              operador SEM dado do dia já fica neutro/esmaecido por linha
              (isAusente/semDados, opacity 0.4, ValorSemDado, sem clique —
              lógica já existente em tempo-indisp-tabela.tsx, não mudou
              nada aqui). Removido o painel antigo "Nenhum dado encontrado"
              + "Mapeamento de Equipe" que SUBSTITUÍA a tabela inteira —
              não existe padrão equivalente no consolidado (lá a tabela
              nunca some, só cada linha fica neutra).

              KpiFrame: mesmo visual atual do consolidado, mantendo somente
              as cantoneiras e o p-3, sem fundo/borda/raio de container.
              Sem overflow-hidden aqui — o wrapper interno da tabela já
              cuida do recorte necessário.

              z-[45] enquanto o popover da engrenagem está aberto — mesmo
              truque de GestorEquipeSection pra tabela ficar ACIMA do
              overlay de blur (z-40) do popover, em vez de escurecida
              junto com o resto da página.
            */}
            <div
              id="tempo-indisp-tabela"
              className={cn(
                "relative",
                // bg-background junto com o z-[45] (mesma correção do
                // consolidado): KpiFrame não tem fundo próprio e as linhas
                // da tabela são transparentes — sem isso só o cabeçalho
                // ficava nítido e as linhas mostravam o blur por trás.
                configPopoverOpen && "z-[45] bg-background",
              )}
              // Inline (não classe): a regra global de troca de tema em
              // globals.css (div { transition: background-color 0.2s ... })
              // é unlayered e vence utilitários do Tailwind — o bg-background
              // entrava com fade de 200ms (a tabela "piscava" sobre o blur).
              // No consolidado o style inline (transition: width) já anula
              // essa regra; aqui o mesmo efeito com transition: none.
              style={{ transition: "none" }}
            >
              <KpiFrame>
                <TempoIndispTabela
                  key="tempo-indisp-visible"
                  operadores={operadoresMerged}
                  nomeFantasia={nomeFantasia}
                  olhoAberto={olhoAberto}
                  onToggleOlho={handleToggleOlho}
                  onRowClick={abrirDialog}
                />
              </KpiFrame>
            </div>

            {/*
              Cabeçalho "Analítico" — MESMO padrão de RetencaoDetalheSection
              (consolidado): reaproveitado tanto FORA do trilho (quando
              vazio, abaixo) quanto DENTRO da área pinada via prop `header`
              (quando há dados) — mesma variável JSX usada nos dois
              lugares, evita duplicar o markup.
            */}
            {(() => {
              const cabecalhoAnalitico = (
                <header className="pt-2 pb-4 mb-6">
                  <h2 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    Analítico
                  </h2>
                </header>
              );

              if (!hasDados) {
                // <div> (não fragmento): header + card viram UM filho só do
                // space-y-10 — o espaço entre eles continua só o mb-6 do
                // header, igual ao consolidado.
                return (
                  <div>
                    {cabecalhoAnalitico}
                    {/*
                      MESMO placeholder "Aguardando dados do dia" do
                      consolidado (retencao-detalhe-section.tsx) — extraído
                      pra AguardandoDadosCard (componente novo, não movido
                      de dentro do arquivo do consolidado, que fica
                      intocado). Sem RetencaoHorizontalScroll nesse estado
                      — mesmo padrão de lá: sem dado, sem GSAP/pin/scrub
                      rodando, só o card estático.
                    */}
                    <AguardandoDadosCard descricao="Ainda não há registros de tempo logado ou indisponibilidade reportados hoje pra sua equipe." />
                  </div>
                );
              }

              return (
                <RetencaoHorizontalScroll
                  dynamicHeight
                  header={cabecalhoAnalitico}
                  slides={[
                    <div key="resumo-pausas" className="flex flex-col gap-6">
                      <CardsResumoAnalitico
                        operadores={operadoresMerged}
                        metaIndisponibilidade={metaIndisponibilidade}
                      />
                      <PausasDetalhadasAnalitico operadores={operadoresIndisp} />
                    </div>,
                    <AderenciaAnalitico
                      key="aderencia"
                      operadores={operadoresMerged}
                      forecastPorOperador={forecastPorOperador}
                    />,
                    <PausasNaoRealizadasAnalitico
                      key="pausas-nao-realizadas"
                      operadores={operadoresMerged}
                      forecastPorOperador={forecastPorOperador}
                    />,
                    // Assinatura DENTRO do último slide, só no desktop (lg:block):
                    // o trilho tem a altura do MAIOR slide (dynamicHeight —
                    // resumo + pausas detalhadas, ~780px), então abaixo do
                    // Estouro sobrava espaço vazio e a assinatura (no fim da
                    // página) ficava fora da tela mesmo com o último card
                    // já visível. No consolidado o trilho tem altura fixa
                    // (≤700px) e ela aparece junto com o último card — aqui,
                    // colocada logo abaixo do Estouro, o efeito é o mesmo.
                    // Mobile (slides empilhados) usa a do fim da seção.
                    <div key="estouro-pausa" className="flex flex-col">
                      <EstouroPausaAnalitico operadores={operadoresMerged} />
                      <div className="mt-10 hidden lg:block">
                        <SignatureFooter />
                      </div>
                    </div>,
                  ]}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG — vive off-screen pra
        não afetar o layout. Renderiza o mesmo KpiFrame + tabela do site
        (variant "screen"), preservando as cantoneiras na imagem copiada.
        `olhoAberto` NÃO é repassado de
        propósito: a exportação sempre força o nome fantasia, nunca revela
        nomes reais só porque o gestor estava com o olho aberto na tela no
        momento do clique.

        SEM `width` explícita de propósito — MESMO mecanismo do wrapper
        equivalente do consolidado (`data-equipe-png-wrapper`, ver
        gestor-equipe-section.tsx): `position: fixed` com só `top`/`left`
        definidos (sem `right` nem `width`) faz o navegador dar shrink-wrap
        no elemento, cuja largura vira a largura INTRÍNSECA do conteúdo real
        (KpiFrame + seu padding real + o grid da tabela por dentro).
        Isso também elimina a barra de rolagem horizontal que aparecia na
        imagem copiada: a variante "screen" da tabela (ScreenTable, dentro de
        TempoIndispTabela) tem seu próprio wrapper interno
        `overflow-x-auto` (necessário na TELA, onde a largura disponível é
        limitada pelo layout responsivo) — com uma largura FORÇADA por fora
        (o valor antigo aqui, calibrado por engano com a matemática da
        variante "excel", que nem é a renderizada neste wrapper), esse
        `overflow-x-auto` podia ficar alguns pixels mais estreito que o
        conteúdo real e abrir uma barra de rolagem sempre visível na captura
        (a lib `modern-screenshot` clona o DOM tal como está, barra
        incluída). Sem `width` forçada, o wrapper (e, por herança, o
        `overflow-x-auto` interno) sempre tem exatamente a largura do
        conteúdo — nunca sobra espaço pra rolar, em nenhum cenário, sem
        depender de nenhuma conta em pixels.
      */}
      {/*
        Assinatura no fim da seção — mt-10 = o space-y-10 que a separa do
        conteúdo no consolidado. Com dados, no desktop ela já aparece dentro
        do último slide do trilho (acima), então aqui fica só no mobile.
      */}
      <div className={cn("mt-10", hasDados && "lg:hidden")}>
        <SignatureFooter />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
        }}
      >
        <div data-tempo-indisp-png>
          <KpiFrame>
            <TempoIndispTabela
              key="tempo-indisp-png"
              operadores={operadoresMerged}
              nomeFantasia={nomeFantasia}
            />
          </KpiFrame>
        </div>
      </div>

      <OperadorAnaliticoDialog
        operador={selecionado}
        nomeExibido={selecionado ? formatNomeDotSobrenome(selecionado.email) : ""}
        aderencia={aderenciaSelecionado}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      </motion.section>
    </>
  );
}
