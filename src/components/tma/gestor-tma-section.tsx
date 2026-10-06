"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { toast } from "sonner";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import {
  COOKIE_LINHAS,
  TMA_TABELA_LARGURA_PX,
  TmaPesoSkeleton,
} from "@/app/(dashboard)/s/reports/tma-peso/tma-peso-skeleton";
import { LimparBaseExpandButton } from "@/components/d-1/limpar-base-expand-button";
import { clearTmaAction } from "@/lib/tma/actions/clear-tma-action";
import { refreshTmaAction } from "@/lib/tma/actions/refresh-tma-action";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatCabecalhoReport } from "@/lib/gestor/format-cabecalho-report";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { useSetasRolagem } from "@/lib/lenis/use-setas-rolagem";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { ConfigTmaPopover } from "./config-tma-popover";
import { CopyTmaButton } from "./copy-tma-button";
import { TmaTable, type TmaLinha } from "./tma-table";
import { TmaUploadDropzone } from "./tma-upload-dropzone";

// Polling: reconsulta a base a cada 30s, sem F5 (mesmo intervalo do Consolidado).
const POLL_INTERVAL_MS = 30_000;

// Piso mínimo (ms) do esqueleto no refresh MANUAL ("Limpar base") — mesma
// duração do piso do carregamento inicial (MIN_LOADING_MS em page.tsx). O
// polling silencioso de 30s continua sem overlay.
const MIN_REFRESH_LOADING_MS = 1_000;

/** Classe dos toasts desta rota (.toast-padrao, globals.css). */
const TOAST_CLASS = "toast-padrao";

interface GestorTmaSectionProps {
  linhas: TmaLinha[];
  atendimentosPorOperador: Record<string, AtendimentoTma[]>;
  reportHora: string;
  reportNomeSupervisor: string | null;
  metaAtualMmSs: string;
  ordemTabela: OrdemTabelaTma;
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  /** Threshold/direção efetivos do TMA (já resolvido no server) — repassado até TmaDetalheDialog pro gráfico "Evolução por hora" do operador. */
  thresholdConfig: TmaThresholdConfig;
}

export function GestorTmaSection({
  linhas: linhasIniciais,
  atendimentosPorOperador: atendimentosIniciais,
  reportHora: reportHoraInicial,
  reportNomeSupervisor: reportNomeSupervisorInicial,
  metaAtualMmSs: metaInicial,
  ordemTabela: ordemInicial,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  thresholdConfig,
}: GestorTmaSectionProps) {
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [atendimentosPorOperador, setAtendimentosPorOperador] = useState(atendimentosIniciais);
  const [reportHora, setReportHora] = useState(reportHoraInicial);
  const [reportNomeSupervisor, setReportNomeSupervisor] = useState(reportNomeSupervisorInicial);
  const [metaAtualMmSs, setMetaAtualMmSs] = useState(metaInicial);
  const [ordemTabela, setOrdemTabela] = useState(ordemInicial);
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
    toggleOlhoAction("tma", novoValor).catch((err) => {
      if (!handleStaleActionError(err)) {
        console.error("[GestorTmaSection] erro ao salvar preferência de olho:", err);
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

  async function refetchTma() {
    try {
      const result = await refreshTmaAction();
      if (result.success) {
        setLinhas(result.linhas);
        setAtendimentosPorOperador(result.atendimentosPorOperador);
        setReportHora(result.reportHora);
        setReportNomeSupervisor(result.reportNomeSupervisor);
        setMetaAtualMmSs(result.metaAtualMmSs);
        setOrdemTabela(result.ordemTabela);
      }
    } catch (err) {
      // Server Action de um build anterior: avisa uma vez e para o polling.
      if (handleStaleActionError(err)) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
      console.error("[GestorTmaSection] erro ao atualizar TMA (polling):", err);
    }
  }

  useEffect(() => {
    pollIntervalRef.current = setInterval(refetchTma, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  async function handleBaseCleared() {
    const inicio = Date.now();
    setIsRefreshing(true);
    try {
      await refetchTma();
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

  const textoReport = formatCabecalhoReport(reportHora, reportNomeSupervisor);

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
                void refetchTma();
              }}
              onOpenChange={setConfigPopoverOpen}
            />
            {showUpload && <LimparBaseExpandButton onConfirm={handleLimparBase} pending={limpandoBase} />}
            <CopyTmaButton horaReport={reportHora} />
          </div>

          {/*
            Wrapper INVISÍVEL usado só pela captura do PNG ("Copiar imagem"),
            off-screen. Usa `linhas` (nome fantasia sempre), nunca a versão
            com o olho aberto.
          */}
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
                <TmaTable
                  key="gestor-tma-png"
                  linhas={linhas}
                  atendimentosPorOperador={atendimentosPorOperador}
                  thresholdConfig={thresholdConfig}
                />
              </KpiFrame>
            </div>
          </div>

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
                  atendimentosPorOperador={atendimentosPorOperador}
                  thresholdConfig={thresholdConfig}
                  headerButton={
                    nomeFantasia?.ativo && (
                      <button
                        type="button"
                        onClick={handleToggleOlho}
                        aria-pressed={olhoAberto}
                        title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                        aria-label={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                        className="text-foreground/80 hover:text-foreground transition-colors inline-block align-middle ml-1.5"
                      >
                        {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                      </button>
                    )
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
