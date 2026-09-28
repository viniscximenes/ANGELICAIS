"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearTmaAction } from "@/lib/tma/actions/clear-tma-action";
import { refreshTmaAction } from "@/lib/tma/actions/refresh-tma-action";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { ConfigTmaPopover } from "./config-tma-popover";
import { CopyTmaButton } from "./copy-tma-button";
import { TmaTable, type TmaLinha } from "./tma-table";
import { TmaUploadDropzone } from "./tma-upload-dropzone";

function formatCabecalhoReport(hora: string, nomeSupervisor: string | null): string | null {
  if (!hora || hora === "—" || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const nome = nomeSupervisor?.trim();
  return nome ? `${nome} fez um report às ${horaCurta}` : `Atualizado às ${horaCurta}`;
}
const POLL_INTERVAL_MS = 30_000;

// Piso mínimo (ms) da tela de loading exibida durante o refresh MANUAL
// ("Limpar base") — mesma lógica/duração do piso mínimo do carregamento
// inicial (ver MIN_LOADING_MS em page.tsx) e do mesmo overlay em
// /reports/consolidado (gestor-equipe-section.tsx). Só cobre o refetch
// disparado PELO USUÁRIO — o polling silencioso de 30s continua sem overlay.
const MIN_REFRESH_LOADING_MS = 3_000;

// Mesma largura-base da tabela do Consolidado (gestor-equipe-section.tsx):
// 760px de conteúdo + 26px de "chrome" do StyledCard por dentro (2 × padding
// 12px + borda 1px), pra a área útil da tabela bater EXATAMENTE 760px.
const TABELA_CARD_CHROME_PX = 26;
const TABELA_LARGURA_PX = 760 + TABELA_CARD_CHROME_PX;

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
  /** Threshold/direção efetivos do TMA (getTmaThresholdConfig, já resolvido no server) — repassado até TmaDetalheDialog pro gráfico "TMA por Hora" do operador, sem query nova (mesmo objeto que AnaliticoTmaSection já recebe via analitico.thresholdConfig). */
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
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  // Overlay de loading do refresh manual (ver MIN_REFRESH_LOADING_MS acima).
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  // sempre `linhas` (nome fantasia já resolvido no server) — nunca a versão
  // com o olho aberto, mesmo que o gestor esteja com ele aberto na tela.
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

  // Handler específico do "Limpar Base" (não reaproveitado pelo polling) —
  // mesmo padrão de handleBaseCleared em gestor-equipe-section.tsx: cobre o
  // refetch com uma tela de loading por pelo menos MIN_REFRESH_LOADING_MS,
  // mesmo que a busca real volte mais rápido.
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

  return (
    <>
      {/*
        Overlay de refresh manual (ver handleBaseCleared/MIN_REFRESH_LOADING_MS
        acima) — mesmo padrão de /reports/consolidado (gestor-equipe-section.tsx):
        reaproveita o esqueleto do Suspense fallback inicial (KpiLoadingScreen
        formato="tma-peso"), fixo por cima só da área de CONTEÚDO (abaixo do
        header de 60px, à direita da sidebar de 240px em telas lg+).
      */}
      {isRefreshing && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] lg:left-[240px]">
          <KpiLoadingScreen
            dataPage="reports-tma-peso"
            titulo="TMA & Peso"
            formato="tma-peso"
            indicatorPosition="after-header"
            spinnerVariant="dots"
          />
        </div>
      )}

    <motion.section
      id="equipe-section"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="tma-equipe"
    >
      <div className="pt-4">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">TMA & Peso</h1>

        {formatCabecalhoReport(reportHora, reportNomeSupervisor) && (
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {formatCabecalhoReport(reportHora, reportNomeSupervisor)}
          </p>
        )}
      </div>

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
        {showUpload && (
          <ClearBaseButton
            action={clearTmaAction}
            onCleared={handleBaseCleared}
            variant="icon-danger"
            holdToConfirm
            toastClassName="reports-tma-peso-toast"
            showSuccessToast={false}
          />
        )}
        <CopyTmaButton horaReport={reportHora} />
      </div>

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG — mesmo padrão de
        gestor-equipe-section.tsx. Usa `linhas` (nome fantasia sempre
        resolvido no server), nunca `linhasParaTela`: a imagem exportada
        nunca deve revelar nomes reais só porque o olho estava aberto na
        tela no momento do clique.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
          width: `${TABELA_LARGURA_PX}px`,
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

      {/*
        Lado a lado, copiado do Consolidado (gestor-equipe-section.tsx):
        tabela à esquerda, card de anexo à direita; empilha abaixo do
        breakpoint `lg`. O wrapper da tabela tem largura fixa (mesma do
        Consolidado, maxWidth 100% no mobile) e o `z-[45]` enquanto o
        popover de meta está aberto, pra tabela ficar acima do overlay.
      */}
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "shrink-0 relative transition-[z-index] duration-0",
            configPopoverOpen && "z-[45]",
          )}
          style={{ width: `${TABELA_LARGURA_PX}px`, maxWidth: "100%" }}
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
    </motion.section>
    </>
  );
}
