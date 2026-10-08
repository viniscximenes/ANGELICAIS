"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { TempoIndispSkeleton, COOKIE_LINHAS } from "@/app/(dashboard)/s/reports/tempo-indisponibilidade/tempo-indisp-skeleton";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { LimparBaseExpandButton } from "@/components/d-1/limpar-base-expand-button";
import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";
import { CabecalhoSecao } from "@/components/gestor/cabecalho-secao";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
} from "@/lib/d1-db/calcular-aderencia";
import { clearTempoLogadoAction } from "@/lib/d1-db/actions/clear-tempo-logado-action";
import { refreshTempoIndispAction } from "@/lib/d1-db/actions/refresh-tempo-indisp-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { formatCabecalhoReport } from "@/lib/gestor/format-cabecalho-report";
import { ordenarOperadoresTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/ordenar-operadores-tempo-indisp";
import type { OrdemTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/types";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { useSetasRolagem } from "@/lib/lenis/use-setas-rolagem";
import { notifyTrilhoDisponivel } from "@/lib/retencao/scroll-to-card-event";
import { useTopoAoCarregar } from "@/lib/lenis/use-topo-ao-carregar";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

import { AderenciaAnalitico } from "./aderencia-analitico";
import { CardsResumoAnalitico } from "./cards-resumo-analitico";
import { TOAST_CLASS } from "./constantes";
import { ConfigTabelaTempoIndispPopover } from "./config-tabela-tempo-indisp-popover";
import { CopyTempoIndispButton } from "./copy-tempo-indisp-button";
import { EstouroPausaAnalitico } from "./estouro-pausa-analitico";
import { mergeOperadoresTempoIndisp, type OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { OperadorAnaliticoDialog } from "./operador-analitico-dialog";
import { PausasDetalhadasAnalitico } from "./pausas-detalhadas-analitico";
import { PausasNaoRealizadasAnalitico } from "./pausas-nao-realizadas-analitico";
import { TempoIndispTabela } from "./tempo-indisp-tabela";

// Piso mínimo (ms) do esqueleto no refresh MANUAL ("Limpar base") — mesma
// duração do piso do carregamento inicial (MIN_LOADING_MS em page.tsx): se
// o refetch já demorou mais que isso, não espera nada extra; se voltou
// rápido, segura o esqueleto até completar, pra não "piscar".
//
// RISCO-ACEITO: depois do "Limpar base", o esqueleto fica no mínimo 1s na tela mesmo com o refetch pronto.
// Motivo: decisão de produto — mesmo piso do overlay do "Limpar Base" do Consolidado, mantido nas auditorias de 2026-10-07.
// Mitigação: só afeta o overlay; a limpeza no banco e o refetch não esperam por ele, e se o refetch passar de 1s não há espera extra.
// Revisar quando: o usuário pedir pra remover o piso, ou o "Limpar base" deixar de mostrar o esqueleto.
const MIN_REFRESH_LOADING_MS = 1_000;

/**
 * Título da página — um só para os dois caminhos de page.tsx (estado
 * vazio/erro, renderizado lá) e a página com dados (renderizado aqui), em
 * vez do mesmo <h1> copiado nos dois arquivos.
 */
export function TituloTempoIndisp() {
  return (
    <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
      Tempo Logado &amp; Indisponibilidade
    </h1>
  );
}

interface TempoIndispSectionProps {
  operadoresTempoLogadoIniciais: GestorTempoLogadoLinha[];
  operadoresIndisponibilidadeIniciais: GestorIndispLinha[];
  horaReportInicial: string | null;
  nomeSupervisorReportInicial?: string | null;
  /** Dias (YYYY-MM-DD) da base do último upload — d1_tempo_logado.report_datas_base. */
  datasBaseReportInicial?: string[] | null;
  pausasProgramadas: PausaProgramadaDb[];
  toleranciaMin: number;
  /** Mostra o anexo e o "Limpar Base" (gated por manage_d1_base na página). */
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
  datasBaseReportInicial = null,
  pausasProgramadas,
  toleranciaMin,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  metaIndisponibilidadeInicial,
  ordemTabelaInicial,
}: TempoIndispSectionProps) {
  // Abre sempre no topo e setas Cima/Baixo rolam a página — mesmos
  // comportamentos do Consolidado.
  useTopoAoCarregar();
  useSetasRolagem();

  const [operadoresTL, setOperadoresTL] = useState(operadoresTempoLogadoIniciais);
  const [operadoresIndisp, setOperadoresIndisp] = useState(operadoresIndisponibilidadeIniciais);
  // Pausas programadas e tolerância também são recarregadas no refetch()
  // (usadas pela Aderência e pelo dialog do operador).
  const [pausasProgramadasState, setPausasProgramadas] = useState(pausasProgramadas);
  const [toleranciaMinState, setToleranciaMin] = useState(toleranciaMin);
  const [horaReport, setHoraReport] = useState(horaReportInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(nomeSupervisorReportInicial);
  const [datasBaseReport, setDatasBaseReport] = useState(datasBaseReportInicial);
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [metaIndisponibilidade, setMetaIndisponibilidade] = useState(metaIndisponibilidadeInicial);
  const [ordemTabela, setOrdemTabela] = useState<OrdemTabelaTempoIndisp>(ordemTabelaInicial);
  // Espelha o open/close do popover de configurações só pra elevar a tabela
  // acima do overlay de blur (z-40) enquanto ele está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limpandoBase, setLimpandoBase] = useState(false);

  // Só o e-mail: o operador do dialog é lido da lista ATUAL a cada render
  // (ver `selecionado` abaixo) — guardar o objeto deixava o dialog aberto
  // com os números de antes de um refetch.
  const [selecionadoEmail, setSelecionadoEmail] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mesmo padrão do handleToggleOlho do Consolidado (GestorEquipeSection):
  // atualização otimista, desfeita se a action devolver { success: false } OU
  // se a promise rejeitar (falha de rede) — nos dois casos a preferência não
  // foi salva.
  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    toggleOlhoAction("tempo_indisponibilidade", novoValor)
      .then((r) => {
        if (!r.success) {
          setOlhoAberto(!novoValor);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      })
      .catch((err) => {
        setOlhoAberto(!novoValor);
        if (!handleStaleActionError(err)) {
          console.error("[TempoIndispSection] erro ao salvar preferência de olho:", err);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      });
  }

  // Nº da última busca disparada: dois refetches seguidos (ex.: "Limpar
  // Base" duas vezes) podem responder fora de ordem — só a resposta da
  // busca MAIS RECENTE é aplicada, a anterior é descartada.
  const refetchSeqRef = useRef(0);

  // Sem polling nesta página (só o Consolidado reconsulta a cada 30s):
  // refetch é MANUAL, disparado pelo "Limpar Base". Salvar a config não
  // precisa dele: o veredito da meta é recalculado na tela (ver
  // mergeOperadoresTempoIndisp).
  async function refetch() {
    const seq = ++refetchSeqRef.current;
    try {
      // Uma action só (tabela + Analítico): cada leitura acontece uma vez
      // no servidor, e a tela recebe tudo junto ou nada.
      const result = await refreshTempoIndispAction();
      if (seq !== refetchSeqRef.current) return;
      if (result.success) {
        setOperadoresTL(result.operadoresTempoLogado);
        setOperadoresIndisp(result.operadoresIndisponibilidade);
        setHoraReport(result.horaReport);
        setNomeSupervisorReport(result.nomeSupervisorReport);
        setDatasBaseReport(result.datasBaseReport);
        setPausasProgramadas(result.pausasProgramadas);
        setToleranciaMin(result.toleranciaMin);
      } else {
        // Falha (inclusive erro de banco, que a action devolve como
        // success:false): a tela mantém o que já mostrava, mas avisa.
        toast.error("Não foi possível atualizar a tabela", {
          description: "Os dados exibidos podem estar desatualizados. Tente novamente.",
          className: TOAST_CLASS,
        });
      }
    } catch (err) {
      if (seq !== refetchSeqRef.current) return;
      if (!handleStaleActionError(err)) {
        console.error("[TempoIndispSection] erro ao atualizar a tabela:", err);
        toast.error("Não foi possível atualizar a tabela", {
          description: "Os dados exibidos podem estar desatualizados. Tente novamente.",
          className: TOAST_CLASS,
        });
      }
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

  // "Limpar Base" — mesmo botão e fluxo do Consolidado: um clique limpa,
  // sem toast de sucesso (o esqueleto já comunica a ação) e sem
  // router.refresh() (handleBaseCleared recarrega tabela e Analítico).
  async function handleLimparBase() {
    setLimpandoBase(true);
    try {
      const r = await clearTempoLogadoAction().finally(() => setLimpandoBase(false));
      if (r.success) {
        await handleBaseCleared();
      } else {
        toast.error(r.error, { className: TOAST_CLASS });
      }
    } catch (err) {
      if (handleStaleActionError(err)) return;
      toast.error("Erro inesperado ao limpar a base", { className: TOAST_CLASS });
      console.error("[TempoIndispSection] erro ao limpar a base:", err);
    }
  }

  // Memoizados: a seção re-renderiza por estado que não muda os dados
  // (popover, dialog, olho, hover no "Copiar imagem"...). Referência estável
  // também evita que os cards do Analítico refaçam os cálculos deles
  // (ver useMemo em AderenciaAnalitico).
  const operadoresMerged = useMemo(
    () =>
      ordenarOperadoresTempoIndisp(
        mergeOperadoresTempoIndisp(operadoresTL, operadoresIndisp, metaIndisponibilidade),
        ordemTabela,
      ),
    [operadoresTL, operadoresIndisp, ordemTabela, metaIndisponibilidade],
  );

  const hasDados = useMemo(
    () => operadoresMerged.some((op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null),
    [operadoresMerged],
  );

  // Avisa a barra lateral (TempoIndispNavSidebar) se o trilho do Analítico
  // existe — sem dados ele não é montado e os itens dela não têm pra onde
  // rolar. Mesmo padrão de RetencaoDetalheSection (Consolidado).
  useEffect(() => {
    notifyTrilhoDisponivel(hasDados);
  }, [hasDados]);
  useEffect(() => () => notifyTrilhoDisponivel(false), []);

  // Tabela oculta do "Copiar imagem" sob demanda — mesmo padrão do
  // Consolidado (GestorEquipeSection): monta com ponteiro em cima/foco no
  // botão e desmonta quando os dois saem e não há captura em andamento.
  // Antes era uma 2ª tabela inteira no DOM o tempo todo, re-renderizando a
  // cada mudança de estado da página.
  const [tabelaPngMontada, setTabelaPngMontada] = useState(false);
  const pngPonteiroRef = useRef(false);
  const pngFocoRef = useRef(false);
  const pngCapturandoRef = useRef(false);
  const desmontarTabelaPngSePossivel = useCallback(() => {
    if (!pngPonteiroRef.current && !pngFocoRef.current && !pngCapturandoRef.current) {
      setTabelaPngMontada(false);
    }
  }, []);
  const pngHandlers = useMemo(
    () => ({
      onPointerOver: () => {
        pngPonteiroRef.current = true;
        setTabelaPngMontada(true);
      },
      onPointerLeave: () => {
        pngPonteiroRef.current = false;
        desmontarTabelaPngSePossivel();
      },
      onFocus: () => {
        pngFocoRef.current = true;
        setTabelaPngMontada(true);
      },
      onBlur: () => {
        pngFocoRef.current = false;
        desmontarTabelaPngSePossivel();
      },
      // Captura: além de marcar a captura, garante a tabela no DOM ANTES do
      // onClick do botão (flushSync aplica na hora). Diferença do
      // Consolidado: no toque, o pointerleave dispara antes do click e já
      // teria desmontado a tabela — lá o clique confia só no hover/foco.
      onClickCapture: () => {
        pngCapturandoRef.current = true;
        flushSync(() => setTabelaPngMontada(true));
      },
    }),
    [desmontarTabelaPngSePossivel],
  );
  const handleCapturaPngFim = useCallback(() => {
    pngCapturandoRef.current = false;
    desmontarTabelaPngSePossivel();
  }, [desmontarTabelaPngSePossivel]);

  // Guarda o nº de operadores pro esqueleto do próximo carregamento
  // (loading.tsx lê no servidor) ter a mesma altura da tabela real.
  useEffect(() => {
    document.cookie = `${COOKIE_LINHAS}=${operadoresMerged.length}; path=/; max-age=31536000; samesite=lax`;
  }, [operadoresMerged.length]);

  const forecastPorOperador = useMemo(
    () => buildForecastPorOperador(pausasProgramadasState),
    [pausasProgramadasState],
  );

  function abrirDialog(op: OperadorAnaliticoTempoIndisp) {
    setSelecionadoEmail(op.email);
    setDialogOpen(true);
  }

  const selecionado = selecionadoEmail
    ? (operadoresMerged.find((op) => op.email === selecionadoEmail) ?? null)
    : null;

  const aderenciaSelecionado = useMemo(
    () =>
      selecionado
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
        : { forecast: null, items: [] },
    [selecionado, forecastPorOperador, toleranciaMinState],
  );

  // "... fez um report às HH:MM  -   (base do dia DD/MM)" — mesma regra do
  // Consolidado, inclusive "(bases do dia ...)" com mais de um dia na base.
  const textoReport = formatCabecalhoReport(horaReport, nomeSupervisorReport, datasBaseReport);
  const cabecalhoAnalitico = <CabecalhoSecao titulo="Analítico" />;

  return (
    <>
      {/*
        Overlay do refresh manual ("Limpar base") — o MESMO esqueleto do F5,
        fixo só sobre a área de conteúdo (abaixo do header de 60px, à direita
        da sidebar de 240px), como um F5 real. overflow-hidden corta o
        esqueleto (min-h-screen); !mb-0 evita que a margem de um space-y-*
        encurte o overlay.
      */}
      {isRefreshing && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mb-0 overflow-hidden lg:left-[240px]">
          <TempoIndispSkeleton linhas={operadoresMerged.length} />
        </div>
      )}

      <div className="space-y-10">
        {/* id: alvo do item "Tabela de operadores" do menu lateral e
            referência da seção ativa (useSecaoAtiva). */}
        <section id="tempo-indisp-section" className="space-y-4">
          <div>
            <div className="pt-4">
              <TituloTempoIndisp />

              {textoReport && (
                <p className="font-sans text-muted-foreground pt-3 text-sm font-normal whitespace-pre-wrap">
                  {textoReport}
                </p>
              )}
            </div>

            {/* Controles: [⚙ Config] [🗑 Limpar base] [Copiar imagem]. */}
            <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
              <ConfigTabelaTempoIndispPopover
                metaIndisponibilidadeInicial={metaIndisponibilidade}
                ordemInicial={ordemTabela}
                onSaved={(meta, ordem) => {
                  // Sem refetch: o veredito da meta (cumpriuMetaIndisp) é
                  // recalculado na tela a partir do percentual, e a ordem é
                  // aplicada aqui mesmo — tabela, dialog e cards mudam juntos.
                  setMetaIndisponibilidade(meta);
                  setOrdemTabela(ordem);
                }}
                onOpenChange={setConfigPopoverOpen}
              />

              {showUpload && (
                <LimparBaseExpandButton onConfirm={handleLimparBase} pending={limpandoBase} />
              )}

              {/* display:contents — não muda o layout da linha de controles.
                  Ponteiro/foco no botão monta a tabela oculta do PNG (ver
                  tabelaPngMontada). */}
              <span className="contents" {...pngHandlers}>
                <CopyTempoIndispButton
                  horaReport={horaReport ?? "—"}
                  onCapturaFim={handleCapturaPngFim}
                />
              </span>
            </div>

            {/*
              Wrapper INVISÍVEL usado só pela captura do PNG ("Copiar
              imagem"), off-screen. Sem `olhoAberto` de propósito: a imagem
              sempre usa o nome fantasia. Sem `width`: position fixed só com
              top/left faz shrink-wrap na largura real do conteúdo, sem
              rolagem horizontal na captura.
              Só montado enquanto o ponteiro/foco está no "Copiar imagem" ou
              uma captura está em andamento (ver pngHandlers).
            */}
            {tabelaPngMontada && (
              <div
                aria-hidden="true"
                style={{ position: "fixed", top: "-99999px", left: "-99999px" }}
              >
                <div data-tempo-indisp-png>
                  <KpiFrame>
                    <TempoIndispTabela operadores={operadoresMerged} nomeFantasia={nomeFantasia} />
                  </KpiFrame>
                </div>
              </div>
            )}

            {/* Anexo em largura cheia ACIMA da tabela: a tabela (8 colunas,
                ≥1190px) não cabe com o anexo ao lado. */}
            <div className="flex flex-col gap-4 pt-2">
              {showUpload && <UploadTempoLogadoDropzone abrirEmDownloads recarregarComModalAberto />}

              {/*
                Tabela sempre visível (o roster inteiro; operador sem dado do
                dia fica esmaecido, sem clique). z-[45] + bg-background com
                o popover aberto: a tabela fica nítida acima do blur (o
                KpiFrame e as linhas não têm fundo próprio). transition
                inline: anula o fade de 200ms da regra global de troca de
                tema no bg-background.
              */}
              <div
                id="tempo-indisp-tabela"
                className={cn("relative", configPopoverOpen && "z-[45] bg-background")}
                style={{ transition: "none" }}
              >
                <KpiFrame>
                  <TempoIndispTabela
                    operadores={operadoresMerged}
                    nomeFantasia={nomeFantasia}
                    olhoAberto={olhoAberto}
                    onToggleOlho={handleToggleOlho}
                    onRowClick={abrirDialog}
                  />
                </KpiFrame>
              </div>
            </div>
          </div>
        </section>

        {/*
          Analítico — mesmo bloco do Consolidado (RetencaoDetalheSection):
          título com divisória; sem dado, o gráfico esqueleto parado com a
          mensagem; com dado, o trilho horizontal pinado de altura fixa (os
          cards rolam por dentro, com cabeçalho fixo).
        */}
        <section>
          {!hasDados && cabecalhoAnalitico}

          {!hasDados ? (
            <GraficoVazio
              titulo="Aguardando dados do dia"
              descricao="Ainda não há registros de tempo logado ou indisponibilidade reportados hoje pra sua equipe."
              altura={350}
            />
          ) : (
            <div className="space-y-6">
              <RetencaoHorizontalScroll
                header={cabecalhoAnalitico}
                // Meta nova muda as cores e as linhas listadas — recalcula o pin.
                refreshKey={metaIndisponibilidade}
                slides={[
                  <div key="resumo-pausas" className="flex h-full flex-col gap-6">
                    <div className="shrink-0">
                      <CardsResumoAnalitico
                        operadores={operadoresMerged}
                        metaIndisponibilidade={metaIndisponibilidade}
                      />
                    </div>
                    <PausasDetalhadasAnalitico operadores={operadoresMerged} />
                  </div>,
                  <AderenciaAnalitico
                    key="aderencia"
                    operadores={operadoresMerged}
                    forecastPorOperador={forecastPorOperador}
                    toleranciaMin={toleranciaMinState}
                  />,
                  <PausasNaoRealizadasAnalitico
                    key="pausas-nao-realizadas"
                    operadores={operadoresMerged}
                    forecastPorOperador={forecastPorOperador}
                  />,
                  // Assinatura DENTRO do último slide, só no desktop: aparece
                  // logo abaixo do último card e desliza junto. O card cede
                  // altura pra ela via min-h-0 (só a tabela rola por dentro).
                  // Mobile (slides empilhados) usa a do fim da seção.
                  <div key="estouro-pausa" className="flex h-full flex-col">
                    <div className="min-h-0">
                      <EstouroPausaAnalitico operadores={operadoresMerged} />
                    </div>
                    <div className="mt-10 hidden shrink-0 lg:block">
                      <SignatureFooter />
                    </div>
                  </div>,
                ]}
              />
            </div>
          )}

          {/* Assinatura no fim da seção — com o trilho ativo, no desktop
              ela já aparece dentro do último slide. */}
          <div className={hasDados ? "mt-10 lg:hidden" : "mt-10"}>
            <SignatureFooter />
          </div>
        </section>
      </div>

      <OperadorAnaliticoDialog
        operador={selecionado}
        nomeExibido={selecionado ? formatNomeDotSobrenome(selecionado.email) : ""}
        aderencia={aderenciaSelecionado}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
