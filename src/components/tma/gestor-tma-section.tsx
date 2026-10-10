"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import {
  COOKIE_LINHAS,
  TMA_TABELA_LARGURA_PX,
  TmaPesoSkeleton,
} from "@/app/(dashboard)/s/reports/tma-peso/tma-peso-skeleton";
import { LimparBaseExpandButton } from "@/components/d-1/limpar-base-expand-button";
import { OlhoToggleButton } from "@/components/gestor/olho-toggle-button";
import { clearTmaAction } from "@/lib/tma/actions/clear-tma-action";
import { refreshTmaAction } from "@/lib/tma/actions/refresh-tma-action";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatCabecalhoReport } from "@/lib/gestor/format-cabecalho-report";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { useSetasRolagem } from "@/lib/lenis/use-setas-rolagem";
import { notifyBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { ConfigTmaPopover } from "./config-tma-popover";
import { CopyTmaButton } from "./copy-tma-button";
import { TmaTable, type TmaLinha } from "./tma-table";
import { TmaUploadDropzone } from "./tma-upload-dropzone";

// Polling: reconsulta a base a cada 30s, sem F5 (mesmo intervalo do Consolidado).
//
// RISCO-ACEITO: com a aba visível, a tabela consulta o servidor a cada 30s mesmo sem base nova.
// Motivo: decisão de produto — a tela é usada aberta o dia todo e precisa refletir uploads de outros gestores sem F5 (mesmo polling do Consolidado).
// Mitigação: não consulta com a aba em segundo plano, nunca sobrepõe duas buscas e o Analítico (consulta pesada) só recarrega quando a versão da base muda.
// Revisar quando: houver Realtime/notificação de base nova, ou o custo por consulta crescer com o volume.
const POLL_INTERVAL_MS = 30_000;

// Piso mínimo (ms) do esqueleto no refresh MANUAL ("Limpar base") — mesma
// duração do piso do carregamento inicial (MIN_LOADING_MS em page.tsx): se
// o refetch já demorou mais que isso, não espera nada extra; se voltou
// rápido, segura o esqueleto até completar, pra não "piscar". O polling
// silencioso de 30s continua sem overlay.
//
// RISCO-ACEITO: depois do "Limpar base", o esqueleto fica no mínimo 1s na tela mesmo com o refetch pronto.
// Motivo: decisão de produto — mesmo piso do overlay do "Limpar Base" do Consolidado, mantido nas auditorias de 2026-10-07.
// Mitigação: só afeta o overlay; a limpeza no banco e o refetch não esperam por ele, e se o refetch passar de 1s não há espera extra.
// Revisar quando: o usuário pedir pra remover o piso, ou o "Limpar base" deixar de mostrar o esqueleto.
const MIN_REFRESH_LOADING_MS = 1_000;

/** Classe dos toasts desta rota (.toast-padrao, globals.css). */
const TOAST_CLASS = "toast-padrao";

interface GestorTmaSectionProps {
  linhas: TmaLinha[];
  reportHora: string;
  reportNomeSupervisor: string | null;
  /** Dias (YYYY-MM-DD) da base do último upload — d1_tma.report_datas_base. */
  datasBaseReport?: string[] | null;
  metaAtualMmSs: string;
  ordemTabela: OrdemTabelaTma;
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  /** Threshold/direção efetivos do TMA (getGestorTma) — repassado até TmaDetalheDialog; atualizado depois pelo polling/salvar. */
  thresholdConfig: TmaThresholdConfig;
  /** Versão da base vinda do servidor (getGestorTma) — o polling compara pra avisar o Analítico. */
  versaoBaseInicial: string;
}

export function GestorTmaSection({
  linhas: linhasIniciais,
  reportHora: reportHoraInicial,
  reportNomeSupervisor: reportNomeSupervisorInicial,
  datasBaseReport: datasBaseReportInicial = null,
  metaAtualMmSs: metaInicial,
  ordemTabela: ordemInicial,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  thresholdConfig: thresholdConfigInicial,
  versaoBaseInicial,
}: GestorTmaSectionProps) {
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [reportHora, setReportHora] = useState(reportHoraInicial);
  const [reportNomeSupervisor, setReportNomeSupervisor] = useState(reportNomeSupervisorInicial);
  const [datasBaseReport, setDatasBaseReport] = useState(datasBaseReportInicial);
  const [metaAtualMmSs, setMetaAtualMmSs] = useState(metaInicial);
  const [ordemTabela, setOrdemTabela] = useState(ordemInicial);
  // Meta efetiva do modal do operador — vem com cada refetch. Antes ficava a
  // do carregamento da página: depois de salvar uma meta nova, a tabela
  // mudava de cor e o modal continuava com a meta antiga até o F5.
  const [thresholdConfig, setThresholdConfig] = useState(thresholdConfigInicial);
  // Espelha o open/close do popover de configurações só pra elevar a tabela
  // acima do overlay de blur (z-40) enquanto ele está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limpandoBase, setLimpandoBase] = useState(false);

  // Setas Cima/Baixo rolam a página — mesmo comportamento do Consolidado.
  useSetasRolagem();

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    // Mesmo fluxo do olho do Consolidado: { success: false } ou falha de rede
    // desfazem a troca — antes a tela ficava com o valor novo e o banco com o
    // antigo (voltava no F5), sem aviso.
    toggleOlhoAction("tma", novoValor)
      .then((r) => {
        if (!r.success) {
          setOlhoAberto(!novoValor);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      })
      .catch((err) => {
        setOlhoAberto(!novoValor);
        if (!handleStaleActionError(err)) {
          console.error("[GestorTmaSection] erro ao salvar preferência de olho:", err);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      });
  }

  // Com o olho aberto, revela o nome derivado do email real. A tabela PNG usa
  // sempre `linhas` (nome fantasia já resolvido no server).
  const linhasParaTela = useMemo(() => {
    if (!nomeFantasia?.ativo || !olhoAberto) return linhas;
    return linhas.map((l) => ({ ...l, nomeExibicao: deriveNomeOperador(l.operatorEmail) }));
  }, [linhas, nomeFantasia, olhoAberto]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Build antigo detectado (handleStaleActionError): não volta a consultar
  // nem quando a aba volta a ficar visível.
  const pararPollingRef = useRef(false);

  // Versão da base do último dado conhecido (getGestorTma) — quando muda
  // (outro gestor subiu ou limpou a base, ou a meta mudou), avisa o
  // Analítico (AnaliticoTmaSection), que tem dados próprios vindos do
  // servidor. Inicializada com a do servidor pra não avisar à toa no 1º poll.
  const versaoBaseRef = useRef(versaoBaseInicial);

  // Evita duas buscas sobrepostas (polling + volta da aba + "Limpar base" +
  // configurações) — antes uma resposta antiga podia sobrescrever uma nova.
  const refetchEmVooRef = useRef<Promise<boolean> | null>(null);

  // Mesmo formato de buscarConsolidado (GestorEquipeSection). Retorna true
  // quando já avisou o Analítico, pra quem chamou não avisar de novo.
  const buscarTma = useCallback(async (): Promise<boolean> => {
    try {
      const result = await refreshTmaAction();
      if (!result.success) return false;
      setLinhas(result.linhas);
      setReportHora(result.reportHora);
      setReportNomeSupervisor(result.reportNomeSupervisor);
      setDatasBaseReport(result.datasBaseReport);
      setMetaAtualMmSs(result.metaAtualMmSs);
      setOrdemTabela(result.ordemTabela);
      setThresholdConfig(result.thresholdConfig);
      if (result.versaoBase !== versaoBaseRef.current) {
        versaoBaseRef.current = result.versaoBase;
        notifyBaseAtualizada();
        return true;
      }
      return false;
    } catch (err) {
      // Server Action de um build anterior: avisa uma vez e para o polling.
      if (handleStaleActionError(err)) {
        pararPollingRef.current = true;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return false;
      }
      console.error("[GestorTmaSection] erro ao atualizar TMA (polling):", err);
      return false;
    }
  }, []);

  // Refetch usado pelo polling e (na hora) pelo "Limpar Base" e pelas
  // configurações — mesma fonte, vários gatilhos. `depoisDaBuscaEmVoo`: uma
  // busca do polling que já estava em voo começou ANTES da ação e traria os
  // dados antigos — nesse caso espera ela terminar e faz uma busca nova
  // (mesma regra de refetchConsolidado).
  const refetchTma = useCallback(
    (depoisDaBuscaEmVoo = false): Promise<boolean> => {
      const iniciar = (): Promise<boolean> => {
        if (!refetchEmVooRef.current) {
          refetchEmVooRef.current = buscarTma().finally(() => {
            refetchEmVooRef.current = null;
          });
        }
        return refetchEmVooRef.current;
      };
      const emVoo = refetchEmVooRef.current;
      if (depoisDaBuscaEmVoo && emVoo) return emVoo.then(iniciar);
      return iniciar();
    },
    [buscarTma],
  );

  // Polling: com a aba em segundo plano não consulta; ao voltar, atualiza
  // na hora (mesmo do Consolidado).
  useEffect(() => {
    function atualizarSeVisivel() {
      if (document.visibilityState === "visible" && !pararPollingRef.current) {
        void refetchTma();
      }
    }
    pollIntervalRef.current = setInterval(atualizarSeVisivel, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", atualizarSeVisivel);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener("visibilitychange", atualizarSeVisivel);
    };
  }, [refetchTma]);

  async function handleBaseCleared() {
    const inicio = Date.now();
    setIsRefreshing(true);
    try {
      // A limpeza vale pra todas as equipes: recarrega a tabela e o
      // Analítico. Só avisa o Analítico se o refetch ainda não avisou.
      const jaAvisou = await refetchTma(true);
      if (!jaAvisou) notifyBaseAtualizada();
    } finally {
      const faltam = MIN_REFRESH_LOADING_MS - (Date.now() - inicio);
      if (faltam > 0) {
        await new Promise((resolve) => setTimeout(resolve, faltam));
      }
      setIsRefreshing(false);
    }
  }

  // "Limpar Base" — mesmo botão e fluxo do Consolidado: um clique limpa,
  // sem toast de sucesso (o esqueleto já comunica a ação).
  async function handleLimparBase() {
    setLimpandoBase(true);
    try {
      const r = await clearTmaAction().finally(() => setLimpandoBase(false));
      if (r.success) {
        await handleBaseCleared();
      } else {
        toast.error(r.error, { className: TOAST_CLASS });
      }
    } catch (err) {
      if (handleStaleActionError(err)) return;
      toast.error("Erro inesperado ao limpar a base", { className: TOAST_CLASS });
      console.error("[GestorTmaSection] erro ao limpar a base:", err);
    }
  }

  // Guarda o nº de operadores pro esqueleto do próximo carregamento
  // (loading.tsx lê no servidor) ter a mesma altura da tabela real.
  useEffect(() => {
    document.cookie = `${COOKIE_LINHAS}=${linhas.length}; path=/; max-age=31536000; samesite=lax`;
  }, [linhas.length]);

  // "... fez um report às HH:MM  -   (base do dia DD/MM)" — mesma regra do
  // Consolidado, inclusive "(bases do dia ...)" com mais de um dia na base.
  const textoReport = formatCabecalhoReport(reportHora, reportNomeSupervisor, datasBaseReport);

  // Tabela oculta do "Copiar imagem" sob demanda — MESMO mecanismo do
  // Consolidado (GestorEquipeSection, tabelaPngMontada): monta com ponteiro
  // em cima/foco no botão e desmonta quando os dois saem e não há captura em
  // andamento. Antes era uma 2ª tabela inteira (com seu próprio dialog) no
  // DOM o tempo todo, re-renderizando a cada poll.
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
      // Captura: o clique sempre vem depois do hover/foco (tabela já montada).
      onClickCapture: () => {
        pngCapturandoRef.current = true;
      },
    }),
    [desmontarTabelaPngSePossivel],
  );
  const handleCapturaPngFim = useCallback(() => {
    pngCapturandoRef.current = false;
    desmontarTabelaPngSePossivel();
  }, [desmontarTabelaPngSePossivel]);

  return (
    <>
      {/*
        Overlay do refresh manual ("Limpar base") — o MESMO esqueleto do F5,
        fixo só sobre a área de conteúdo (abaixo do header de 60px, à direita
        da sidebar de 240px), como um F5 real. overflow-hidden corta o
        esqueleto; !mb-0 evita que a margem do space-y-10 de page.tsx
        encurte o overlay.
      */}
      {isRefreshing && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mb-0 overflow-hidden lg:left-[240px]">
          <TmaPesoSkeleton linhas={linhas.length} />
        </div>
      )}

      {/* id: alvo do item "Tabela de operadores" do menu lateral e
          referência da seção ativa (useSecaoAtiva). */}
      <section id="equipe-section" className="space-y-4">
        <div>
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              TMA &amp; Peso
            </h1>

            {textoReport && (
              <p className="font-sans text-muted-foreground pt-3 text-sm font-normal whitespace-pre-wrap">
                {textoReport}
              </p>
            )}
          </div>

          {/* Controles: [⚙ Config] [🗑 Limpar base] [Copiar imagem]. */}
          <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
            <ConfigTmaPopover
              metaInicial={metaAtualMmSs}
              ordemInicial={ordemTabela}
              onSaved={(meta, ordem) => {
                setMetaAtualMmSs(meta);
                setOrdemTabela(ordem);
                // Meta nova muda a versão da base → o refetch avisa o Analítico.
                void refetchTma(true);
              }}
              onOpenChange={setConfigPopoverOpen}
            />
            {showUpload && <LimparBaseExpandButton onConfirm={handleLimparBase} pending={limpandoBase} />}
            {/* display:contents — não muda o layout da linha de controles.
                Ponteiro em cima ou foco no botão monta a tabela oculta do PNG
                (ver tabelaPngMontada); o clique vem sempre depois disso. */}
            <span className="contents" {...pngHandlers}>
              <CopyTmaButton horaReport={reportHora} onCapturaFim={handleCapturaPngFim} />
            </span>
          </div>

          {/*
            Wrapper INVISÍVEL usado só pela captura do PNG ("Copiar imagem"),
            off-screen. Usa `linhas` (nome fantasia sempre), nunca a versão
            com o olho aberto. Só montado enquanto o ponteiro/foco está no
            "Copiar imagem" ou uma captura está em andamento (pngHandlers), e
            sem o modal de detalhe (comDetalhe={false}).
          */}
          {tabelaPngMontada && (
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                top: "-99999px",
                left: "-99999px",
                width: `${TMA_TABELA_LARGURA_PX}px`,
              }}
            >
              <div data-tma-png>
                <KpiFrame>
                  <TmaTable key="gestor-tma-png" linhas={linhas} thresholdConfig={thresholdConfig} comDetalhe={false} />
                </KpiFrame>
              </div>
            </div>
          )}

          {/* Tabela à esquerda, anexo à direita (empilha abaixo de lg). */}
          <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
            <div
              className={cn(
                "shrink-0 relative",
                // bg-background junto com o z-[45]: KpiFrame e linhas não têm
                // fundo próprio — sem isso as linhas mostravam o blur por trás.
                configPopoverOpen && "z-[45] bg-background",
              )}
              // transition inline: anula o fade de 200ms da regra global de
              // troca de tema no bg-background.
              style={{ width: `${TMA_TABELA_LARGURA_PX}px`, maxWidth: "100%", transition: "none" }}
            >
              <KpiFrame className="h-full">
                <TmaTable
                  key="gestor-tma-visible"
                  linhas={linhasParaTela}
                  thresholdConfig={thresholdConfig}
                  headerButton={
                    // Botão compartilhado (o mesmo das outras tabelas do
                    // padrão): área de clique de 24×24px, aria-pressed e
                    // nome fixo pro leitor de tela.
                    nomeFantasia?.ativo && <OlhoToggleButton olhoAberto={olhoAberto} onToggle={handleToggleOlho} />
                  }
                />
              </KpiFrame>
            </div>

            {showUpload && (
              <div className="min-h-[180px] min-w-0 flex-1 self-stretch">
                <TmaUploadDropzone />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
