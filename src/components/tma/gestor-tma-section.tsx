"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

import { OlhoToggleButton } from "@/components/gestor/olho-toggle-button";
import { StyledCard } from "@/components/gestor/styled-card";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearTmaAction } from "@/lib/tma/actions/clear-tma-action";
import { refreshTmaAction } from "@/lib/tma/actions/refresh-tma-action";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import type { TmaThresholdConfig } from "@/lib/tma/tma-status";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { ConfigTmaPopover } from "./config-tma-popover";
import { CopyTmaButton } from "./copy-tma-button";
import { TmaAjudaFive9Dialog } from "./tma-ajuda-five9-dialog";
import { TmaTable, type TmaLinha } from "./tma-table";
import { TmaUploadDropzone } from "./tma-upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const POLL_INTERVAL_MS = 30_000;

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

  return (
    <motion.section
      id="equipe-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="mb-0 flex flex-wrap items-center justify-between gap-4 pt-0 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="ds-h2">Equipe</h2>
          {formatReportLabel(reportHora, reportNomeSupervisor) && (
            <span className="ds-mono-sm text-foreground/80 font-medium">
              - {formatReportLabel(reportHora, reportNomeSupervisor)}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <CopyTmaButton horaReport={reportHora} />
          {showUpload && <ClearBaseButton action={clearTmaAction} onCleared={refetchTma} />}
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
        </div>
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
          <StyledCard withGradient className="p-3">
            <TmaTable
              key="gestor-tma-png"
              linhas={linhas}
              atendimentosPorOperador={atendimentosPorOperador}
              thresholdConfig={thresholdConfig}
            />
          </StyledCard>
        </div>
      </div>

      {/*
        Lado a lado, copiado do Consolidado (gestor-equipe-section.tsx):
        tabela à esquerda, card de anexo à direita; empilha abaixo do
        breakpoint `lg`. O wrapper da tabela tem largura fixa (mesma do
        Consolidado, maxWidth 100% no mobile) e o `z-[45]` enquanto o
        popover de meta está aberto, pra tabela ficar acima do overlay.
      */}
      <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "shrink-0 relative transition-[z-index] duration-0",
            configPopoverOpen && "z-[45]",
          )}
          style={{ width: `${TABELA_LARGURA_PX}px`, maxWidth: "100%" }}
        >
          <StyledCard withGradient className="h-full p-3">
            <TmaTable
              key="gestor-tma-visible"
              linhas={linhasParaTela}
              atendimentosPorOperador={atendimentosPorOperador}
              thresholdConfig={thresholdConfig}
              headerButton={
                nomeFantasia?.ativo && (
                  <OlhoToggleButton olhoAberto={olhoAberto} onToggle={handleToggleOlho} />
                )
              }
            />
          </StyledCard>
        </div>

        {showUpload && (
          <div className="min-h-[180px] min-w-0 flex-1">
            <StyledCard withGradient className="flex h-full flex-col p-3">
              <span className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                Anexar Base
                <TmaAjudaFive9Dialog />
              </span>
              <div className="min-h-0 flex-1">
                <TmaUploadDropzone />
              </div>
            </StyledCard>
          </div>
        )}
      </div>
    </motion.section>
  );
}
