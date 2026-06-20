"use client";

import { motion } from "framer-motion";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearConsolidadoAction } from "@/lib/google/d1/actions/clear-consolidado-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface GestorEquipeSectionProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  /** Nome da gestora — usado no texto do report copiado. */
  gestora?: string;
  /** Mostra a área de upload da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
}

/**
 * Tabela de operadores da equipe do gestor. Reusa a EquipeTable do D-1
 * (variant screen na tela, variant excel no wrapper invisível usado pelo PNG)
 * e o CopyTableButton — mesmo fluxo de exportação do relatório atual.
 *
 * Quando showUpload, mostra o mesmo dropzone do D-1, com a regra dos 30 min
 * ativada. Não inclui gráfico de evolução (fora do escopo).
 */
export function GestorEquipeSection({
  operadores,
  equipe,
  gestora,
  showUpload = false,
}: GestorEquipeSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="ds-mono text-muted-foreground">01</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Equipe</h2>
            {equipe.horaReport && equipe.horaReport !== "—" && (
              <span className="ds-mono-sm text-muted-foreground">
                - atualizado às {equipe.horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? equipe.horaReport}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CopyTableButton
              operadores={operadores}
              equipe={equipe}
              supervisor={gestora}
            />
            {showUpload && <ClearBaseButton action={clearConsolidadoAction} />}
          </div>
        </div>

        {/*
          Wrapper INVISÍVEL usado SÓ pela captura do PNG (variant excel). Vive
          off-screen pra não afetar o layout. O CopyTableButton procura por
          [data-tabela-png].
        */}
        <div
          data-equipe-png-wrapper
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
            width: "600px",
          }}
        >
          <div data-tabela-png>
            <EquipeTable
              key="gestor-equipe-png"
              operadores={operadores}
              equipe={equipe}
              variant="excel"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="shrink-0" style={{ width: "600px", maxWidth: "100%" }}>
            <EquipeTable
              key="gestor-equipe-visible"
              operadores={operadores}
              equipe={equipe}
            />
          </div>

          {showUpload && (
            <div className="min-h-[180px] min-w-0 flex-1">
              <UploadDropzone confirmRecentReport />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
