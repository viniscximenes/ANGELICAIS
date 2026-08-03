"use client";

import { useEffect, useState } from "react";
import { IconClock, IconUsersGroup } from "@tabler/icons-react";
import { motion } from "framer-motion";

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
import { IndisponibilidadePausasTable } from "./indisponibilidade-pausas-table";
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

  // Polling: reconsulta os dois datasets a cada 30s (sem F5)
  useEffect(() => {
    const interval = setInterval(async () => {
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
    }, POLL_INTERVAL_MS);
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
            <CopyTempoLogadoButton
              horaReport={horaReport}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            <CopyIndisponibilidadeButton
              horaReport={horaReport}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            {showUpload && <ClearBaseButton action={clearTempoLogadoAction} />}
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

        {/* Bloco Tabela de Pausas Detalhadas */}
        <div className="mt-8">
          <div className="flex items-center gap-3 py-4">
            <h2 className="ds-h2 flex items-center gap-2">
              <IconClock
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              Tabela de Pausas Detalhadas
            </h2>
          </div>

          <div className="border-t border-dashed border-border pt-4">
            <StyledCard withGradient className="p-3">
              <IndisponibilidadePausasTable operadores={operadoresIndisp} />
            </StyledCard>
          </div>
        </div>
      </div>

      {/*
        Wrappers offscreen usados SÓ pela captura do PNG (variant excel).
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
          <TempoLogadoTable
            key="gestor-tempo-logado-png"
            operadores={operadoresTL}
            variant="excel"
            nomeFantasia={nomeFantasia}
          />
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
          <IndisponibilidadeTable
            operadores={operadoresIndisp}
            variant="excel"
            nomeFantasia={nomeFantasia}
          />
        </div>
      </div>
    </motion.section>
  );
}
