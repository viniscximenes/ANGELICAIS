"use client";

import { motion } from "framer-motion";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { CopyTableButton } from "./copy-table-button";
import { EquipeTable } from "./equipe-table";
import { UploadDropzone } from "./upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface EquipeSectionProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  showUpload?: boolean;
}

export function EquipeSection({
  operadores,
  equipe,
  showUpload = false,
}: EquipeSectionProps) {
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

      {/* Título + botão copiar */}
      <div
        className="flex items-center justify-between gap-4"
        style={{ maxWidth: "780px" }}
      >
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">03</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Equipe / Anexo</h2>
        </div>
        <CopyTableButton equipe={equipe} />
      </div>

      {/* Grid: tabela à esquerda (780px) + upload à direita (resto) */}
      <div
        className="grid items-stretch gap-4"
        style={{ gridTemplateColumns: "780px 1fr" }}
      >
        <div>
          <EquipeTable operadores={operadores} equipe={equipe} />
        </div>

        {showUpload && (
          <div>
            <UploadDropzone />
          </div>
        )}
      </div>
    </motion.section>
  );
}
