"use client";

import { useEffect, useMemo, useState } from "react";
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
import { refreshIndisponibilidadeAction } from "@/lib/d1-db/actions/refresh-indisponibilidade-action";
import { refreshTempoLogadoAction } from "@/lib/d1-db/actions/refresh-tempo-logado-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { formatCabecalhoReport } from "@/lib/gestor/format-cabecalho-report";
import { ordenarOperadoresTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/ordenar-operadores-tempo-indisp";
import type { OrdemTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/types";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { useSetasRolagem } from "@/lib/lenis/use-setas-rolagem";
import { useTopoAoCarregar } from "@/lib/lenis/use-topo-ao-carregar";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

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

// Piso mínimo (ms) do esqueleto no refresh MANUAL ("Limpar base") — mesma
// duração do piso do carregamento inicial (MIN_LOADING_MS em page.tsx).
const MIN_REFRESH_LOADING_MS = 1_000;

/** Classe dos toasts desta rota (.toast-padrao, globals.css). */
const TOAST_CLASS = "toast-padrao";

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

  const [selecionado, setSelecionado] = useState<OperadorAnaliticoTempoIndisp | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("tempo_indisponibilidade", novoValor);
  }

  // Sem polling nesta página (só o Consolidado reconsulta a cada 30s):
  // refetch é MANUAL, disparado pelo "Limpar Base" e pelo popover de
  // configurações. `metaOverride`: logo após salvar uma meta nova o state
  // ainda não a reflete — passa o valor recém-salvo direto.
  async function refetch(metaOverride?: number) {
    try {
      const [tlResult, indispResult] = await Promise.all([
        refreshTempoLogadoAction(),
        refreshIndisponibilidadeAction(metaOverride ?? metaIndisponibilidade),
      ]);
      if (tlResult.success) {
        setOperadoresTL(tlResult.operadores);
        setHoraReport(tlResult.horaReport);
        setNomeSupervisorReport(tlResult.nomeSupervisorReport);
        setDatasBaseReport(tlResult.datasBaseReport);
      }
      if (indispResult.success) {
        setOperadoresIndisp(indispResult.operadores);
        setPausasProgramadas(indispResult.pausasProgramadas);
        setToleranciaMin(indispResult.toleranciaMin);
      }
    } catch (err) {
      if (!handleStaleActionError(err)) {
        console.error("[TempoIndispSection] erro ao atualizar a tabela:", err);
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

  const operadoresMerged = ordenarOperadoresTempoIndisp(
    mergeOperadoresTempoIndisp(operadoresTL, operadoresIndisp),
    ordemTabela,
  );

  const hasDados = operadoresMerged.some(
    (op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null,
  );

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
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Tempo Logado &amp; Indisponibilidade
              </h1>

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
                  setMetaIndisponibilidade(meta);
                  setOrdemTabela(ordem);
                  // cumpriuMeta é recalculado no servidor — refetch na hora
                  // com a meta recém-salva.
                  void refetch(meta);
                }}
                onOpenChange={setConfigPopoverOpen}
              />

              {showUpload && (
                <LimparBaseExpandButton onConfirm={handleLimparBase} pending={limpandoBase} />
              )}

              <CopyTempoIndispButton horaReport={horaReport ?? "—"} />
            </div>

            {/*
              Wrapper INVISÍVEL usado só pela captura do PNG ("Copiar
              imagem"), off-screen. Sem `olhoAberto` de propósito: a imagem
              sempre usa o nome fantasia. Sem `width`: position fixed só com
              top/left faz shrink-wrap na largura real do conteúdo, sem
              rolagem horizontal na captura.
            */}
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
