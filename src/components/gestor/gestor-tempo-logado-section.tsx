"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { GestorTempoLogadoLinha } from "@/lib/google/gestor/tempo-logado-types";
import { computeTempoLogadoResumo } from "@/lib/google/gestor/compute-tempo-logado-resumo";

import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearTempoLogadoAction } from "@/lib/google/d1/actions/clear-tempo-logado-action";
import { CopyTempoLogadoButton } from "./copy-tempo-logado-button";
import { TempoLogadoGrafico } from "./tempo-logado-grafico";
import { TempoLogadoResumoCards } from "./tempo-logado-resumo-cards";
import { TempoLogadoTable } from "./tempo-logado-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface GestorTempoLogadoSectionProps {
  operadores: GestorTempoLogadoLinha[];
  horaReport: string;
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
}

export function GestorTempoLogadoSection({
  operadores,
  horaReport,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
}: GestorTempoLogadoSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const resumo = computeTempoLogadoResumo(operadores);

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("tempo_logado", novoValor);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3">
        {/* Cabeçalho da seção */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="ds-mono text-muted-foreground">01</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Equipe</h2>
            {horaReport && horaReport !== "—" && (
              <span className="ds-mono-sm text-muted-foreground">
                - atualizado às {horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CopyTempoLogadoButton horaReport={horaReport} />
            {showUpload && <ClearBaseButton action={clearTempoLogadoAction} />}
          </div>
        </div>

        {/* 1. Tabela + upload no topo */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="shrink-0" style={{ width: "650px", maxWidth: "100%" }}>
            <TempoLogadoTable
              key="gestor-tempo-logado-visible"
              operadores={operadores}
              nomeFantasia={nomeFantasia}
              olhoAberto={olhoAberto}
              onToggleOlho={handleToggleOlho}
            />
          </div>

          {showUpload && (
            <div className="min-h-[180px] min-w-0 flex-1">
              <UploadTempoLogadoDropzone />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      {/* 2. Cards de resumo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">02</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Visão Rápida</h2>
        </div>
      </div>

      <TempoLogadoResumoCards resumo={resumo} />

      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      {/* 3. Gráfico de barras */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">03</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Visão Detalhada</h2>
        </div>
      </div>

      <TempoLogadoGrafico operadores={operadores} />

      {/*
        Wrapper offscreen usado SOMENTE pela captura do PNG (variant excel).
        CopyTempoLogadoButton procura por [data-tabela-png].
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
            operadores={operadores}
            variant="excel"
            nomeFantasia={nomeFantasia}
          />
        </div>
      </div>
    </motion.section>
  );
}
