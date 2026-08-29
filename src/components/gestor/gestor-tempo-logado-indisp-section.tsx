"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconChartBar, IconUsersGroup } from "@tabler/icons-react";
import { motion } from "motion/react";

import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { StyledCard } from "@/components/gestor/styled-card";
import { clearTempoLogadoAction } from "@/lib/d1-db/actions/clear-tempo-logado-action";
import { refreshIndisponibilidadeAction } from "@/lib/d1-db/actions/refresh-indisponibilidade-action";
import { refreshTempoLogadoAction } from "@/lib/d1-db/actions/refresh-tempo-logado-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";

import { CopyIndisponibilidadeButton } from "./copy-indisponibilidade-button";
import { CopyTempoLogadoButton } from "./copy-tempo-logado-button";
import { IndisponibilidadeTable } from "./indisponibilidade-table";
import { TempoLogadoTable } from "./tempo-logado-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Reconsulta os dois datasets (mesma guia "<GUIA>2") a cada 30s, sem F5.
const POLL_INTERVAL_MS = 30_000;

interface GestorTempoLogadoIndispSectionProps {
  operadoresTempoLogado: GestorTempoLogadoLinha[];
  operadoresIndisponibilidade: GestorIndispLinha[];
  /** Hora + nome do último report — 'BASE - 2'!L2, compartilhada pelos dois datasets. */
  horaReport: string;
  nomeSupervisorReport?: string | null;
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicialTempoLogado?: boolean;
  olhoInicialIndisponibilidade?: boolean;
}

export function GestorTempoLogadoIndispSection({
  operadoresTempoLogado: tlIniciais,
  operadoresIndisponibilidade: indispIniciais,
  horaReport: horaReportInicial,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
  showUpload = false,
  nomeFantasia,
  olhoInicialTempoLogado = false,
  olhoInicialIndisponibilidade = false,
}: GestorTempoLogadoIndispSectionProps) {
  const [operadoresTL, setOperadoresTL] = useState(tlIniciais);
  const [operadoresIndisp, setOperadoresIndisp] = useState(indispIniciais);
  const [horaReport, setHoraReport] = useState(horaReportInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );
  const [olhoTL, setOlhoTL] = useState(olhoInicialTempoLogado);
  const [olhoIndisp, setOlhoIndisp] = useState(olhoInicialIndisponibilidade);

  function handleToggleOlhoTL() {
    const novoValor = !olhoTL;
    setOlhoTL(novoValor);
    void toggleOlhoAction("tempo_logado", novoValor);
  }

  function handleToggleOlhoIndisp() {
    const novoValor = !olhoIndisp;
    setOlhoIndisp(novoValor);
    void toggleOlhoAction("indisponibilidade", novoValor);
  }

  // Refetch usado tanto pelo polling quanto (imediatamente, sem esperar os
  // 30s) pelo ClearBaseButton — mesma fonte, dois gatilhos.
  async function refetchTempoLogadoEIndisp() {
    const [tlResult, indispResult] = await Promise.all([
      refreshTempoLogadoAction(),
      refreshIndisponibilidadeAction(),
    ]);
    if (tlResult.success) {
      setOperadoresTL(tlResult.operadores);
      setHoraReport(tlResult.horaReport);
      setNomeSupervisorReport(tlResult.nomeSupervisorReport);
    }
    if (indispResult.success) {
      setOperadoresIndisp(indispResult.operadores);
    }
  }

  // Polling: reconsulta os dois datasets a cada 30s (sem F5)
  useEffect(() => {
    const interval = setInterval(refetchTempoLogadoEIndisp, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Navegação via teclado: setas Cima (ArrowUp) e Baixo (ArrowDown) rolam a página
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        window.scrollBy({ top: 120, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ top: -120, behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div>
        {/* Header row no estilo exato do D-1 */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <h2 className="ds-h2 flex items-center gap-2">
              <IconUsersGroup
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              Equipe
            </h2>
            {formatReportLabel(horaReport, nomeSupervisorReport) && (
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatReportLabel(horaReport, nomeSupervisorReport)}
              </span>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/reports/tempo-indisponibilidade/analitico"
              className="bg-primary text-primary-foreground hover:opacity-90 flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 shadow-sm transition-opacity"
              style={{ fontSize: "12px" }}
            >
              <IconChartBar size={14} aria-hidden="true" />
              <span className="ds-mono-sm font-medium">Analítico</span>
            </Link>

            <CopyTempoLogadoButton
              horaReport={horaReport}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            <CopyIndisponibilidadeButton
              horaReport={horaReport}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            {showUpload && (
              <ClearBaseButton
                action={clearTempoLogadoAction}
                onCleared={refetchTempoLogadoEIndisp}
              />
            )}
          </div>
        </div>

        {/* Divisória + Seção com Cards StyledCard */}
        <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4">
          {showUpload && (
            <div className="min-h-[90px] w-full">
              <StyledCard withGradient className="flex h-full flex-col p-3">
                <div className="min-h-0 flex-1">
                  <UploadTempoLogadoDropzone />
                </div>
              </StyledCard>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <StyledCard withGradient className="h-full p-3">
                <div className="mb-2">
                  <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wider">
                    Tempo Logado
                  </span>
                </div>
                <TempoLogadoTable
                  key="gestor-tempo-logado-visible"
                  operadores={operadoresTL}
                  nomeFantasia={nomeFantasia}
                  olhoAberto={olhoTL}
                  onToggleOlho={handleToggleOlhoTL}
                />
              </StyledCard>
            </div>

            <div className="min-w-0">
              <StyledCard withGradient className="h-full p-3">
                <div className="mb-2">
                  <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wider">
                    Indisponibilidade
                  </span>
                </div>
                <IndisponibilidadeTable
                  operadores={operadoresIndisp}
                  nomeFantasia={nomeFantasia}
                  olhoAberto={olhoIndisp}
                  onToggleOlho={handleToggleOlhoIndisp}
                />
              </StyledCard>
            </div>
          </div>
        </div>


      </div>

      {/*
        Wrappers INVISÍVEIS usados SÓ pela captura do PNG. Vivem off-screen
        pra não afetar o layout. Renderizam o MESMO StyledCard + tabela do
        site (variant "screen" padrão, com as cantoneiras e o --shadow-sm) —
        nada de template "excel" hardcoded à parte, pra imagem exportada sair
        idêntica ao que está na tela, nos dois temas. O respiro ao redor e o
        --background do tema atual são aplicados pelo `capturarComoPng`.
        `olhoAberto` NÃO é repassado de propósito: a exportação sempre força
        o nome fantasia, nunca revela nomes reais só porque o gestor estava
        com o olho aberto na tela no momento do clique.
        Selectors distintos ([data-tabela-png] / [data-indisp-png]) —
        CopyTempoLogadoButton e CopyIndisponibilidadeButton cada um procura
        o seu, sem colisão.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
          width: "650px",
        }}
      >
        <div data-tabela-png>
          <StyledCard withGradient className="p-3">
            <div className="mb-2">
              <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wider">
                Tempo Logado
              </span>
            </div>
            <TempoLogadoTable
              key="gestor-tempo-logado-png"
              operadores={operadoresTL}
              nomeFantasia={nomeFantasia}
            />
          </StyledCard>
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
          width: "700px",
        }}
      >
        <div data-indisp-png>
          <StyledCard withGradient className="p-3">
            <div className="mb-2">
              <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wider">
                Indisponibilidade
              </span>
            </div>
            <IndisponibilidadeTable
              operadores={operadoresIndisp}
              nomeFantasia={nomeFantasia}
            />
          </StyledCard>
        </div>
      </div>
    </motion.section>
  );
}
