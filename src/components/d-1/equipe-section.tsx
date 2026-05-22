"use client";

import { motion } from "framer-motion";

import type { EvolucaoSnapshot } from "@/lib/d1/evolucao/types";
import { clearConsolidadoAction } from "@/lib/google/d1/actions/clear-consolidado-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { ClearBaseButton } from "./clear-base-button";
import { CopyTableButton } from "./copy-table-button";
import { DownloadTableButton } from "./download-table-button";
import { EquipeTable } from "./equipe-table";
import { EvolucaoEmptyState } from "./evolucao/evolucao-empty-state";
import { EvolucaoGrafico } from "./evolucao/evolucao-grafico";
import { UploadDropzone } from "./upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface EquipeSectionProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  snapshots: EvolucaoSnapshot[];
  showUpload?: boolean;
}

export function EquipeSection({
  operadores,
  equipe,
  snapshots,
  showUpload = false,
}: EquipeSectionProps) {
  const hasSnapshots = snapshots.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="flex flex-col gap-3">
        {/* Linha 1: header compartilhado (título alinhado com tabela, botão alinhado com anexo) */}
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0" style={{ width: "600px" }}>
            <div className="flex items-baseline gap-3">
              <span className="ds-mono text-muted-foreground">03</span>
              <span className="ds-mono text-muted-foreground">·</span>
              <h2 className="ds-h2">Equipe</h2>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <CopyTableButton operadores={operadores} equipe={equipe} />
            <DownloadTableButton />
            {showUpload && <ClearBaseButton action={clearConsolidadoAction} />}
          </div>
        </div>

        {/*
          Wrapper INVISÍVEL usado SÓ pela captura do PNG (tabela + gráfico
          empilhados). Vive off-screen pra não afetar o layout normal.
        */}
        <div
          data-equipe-png-wrapper
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
            width: "600px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <EquipeTable
            key="equipe-png"
            operadores={operadores}
            equipe={equipe}
          />
          {hasSnapshots && (
            <EvolucaoGrafico key="grafico-png" snapshots={snapshots} />
          )}
        </div>

        {/* Layout visível: tabela à esquerda | (gráfico em cima + dropzone embaixo) à direita */}
        <div className="flex items-stretch gap-4">
          <div className="shrink-0" style={{ width: "600px" }}>
            <EquipeTable
              key="equipe-visible"
              operadores={operadores}
              equipe={equipe}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              {hasSnapshots ? (
                <EvolucaoGrafico key="grafico-visible" snapshots={snapshots} />
              ) : (
                <EvolucaoEmptyState />
              )}
            </div>

            {showUpload && (
              <div className="min-h-0 flex-1">
                <UploadDropzone />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
