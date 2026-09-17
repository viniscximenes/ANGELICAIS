"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconEye, IconEyeOff, IconUsersGroup } from "@tabler/icons-react";
import { motion } from "motion/react";

import { StyledCard } from "@/components/gestor/styled-card";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearTmaAction } from "@/lib/tma/actions/clear-tma-action";
import { refreshTmaAction } from "@/lib/tma/actions/refresh-tma-action";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { ConfigTmaPopover } from "./config-tma-popover";
import { CopyTmaButton } from "./copy-tma-button";
import { TmaAjudaFive9Dialog } from "./tma-ajuda-five9-dialog";
import { TmaTable, type TmaLinha } from "./tma-table";
import { TmaUploadDropzone } from "./tma-upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const POLL_INTERVAL_MS = 30_000;

interface GestorTmaSectionProps {
  linhas: TmaLinha[];
  atendimentosPorOperador: Record<string, AtendimentoTma[]>;
  reportHora: string;
  reportNomeSupervisor: string | null;
  metaAtualMmSs: string;
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
}

export function GestorTmaSection({
  linhas: linhasIniciais,
  atendimentosPorOperador: atendimentosIniciais,
  reportHora: reportHoraInicial,
  reportNomeSupervisor: reportNomeSupervisorInicial,
  metaAtualMmSs: metaInicial,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
}: GestorTmaSectionProps) {
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [atendimentosPorOperador, setAtendimentosPorOperador] = useState(atendimentosIniciais);
  const [reportHora, setReportHora] = useState(reportHoraInicial);
  const [reportNomeSupervisor, setReportNomeSupervisor] = useState(reportNomeSupervisorInicial);
  const [metaAtualMmSs, setMetaAtualMmSs] = useState(metaInicial);
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <h2 className="ds-h2 flex items-center gap-2">
            <IconUsersGroup className="text-muted-foreground size-4" aria-hidden="true" />
            Equipe
          </h2>
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
            onSaved={(meta) => {
              setMetaAtualMmSs(meta);
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
        style={{ position: "fixed", top: "-99999px", left: "-99999px", width: "1180px" }}
      >
        <div data-tma-png>
          <StyledCard withGradient className="p-3">
            <TmaTable
              key="gestor-tma-png"
              linhas={linhas}
              atendimentosPorOperador={atendimentosPorOperador}
            />
          </StyledCard>
        </div>
      </div>

      {/*
        Layout empilhado (não lado-a-lado): com 10 colunas a tabela precisa
        de toda a largura disponível — um grid 2 colunas espremia a última
        coluna (Hotline + Churn) pra fora da tela.
      */}
      <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4">
        {showUpload && (
          <div className="w-full">
            <StyledCard withGradient className="p-3">
              <span className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                Atualizar Base D-1
                <TmaAjudaFive9Dialog />
              </span>
              <TmaUploadDropzone compact />
            </StyledCard>
          </div>
        )}

        <div
          className={`relative w-full transition-[z-index] duration-0 ${
            configPopoverOpen ? "z-[45]" : ""
          }`}
        >
          <StyledCard withGradient className="h-full p-3">
            <p className="text-muted-foreground mb-2 text-xs">
              Clique no nome do operador para ver o detalhamento
            </p>
            <TmaTable
              key="gestor-tma-visible"
              linhas={linhasParaTela}
              atendimentosPorOperador={atendimentosPorOperador}
              headerButton={
                nomeFantasia?.ativo && (
                  <button
                    type="button"
                    onClick={handleToggleOlho}
                    title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center"
                  >
                    {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>
                )
              }
            />
          </StyledCard>
        </div>
      </div>
    </motion.section>
  );
}
