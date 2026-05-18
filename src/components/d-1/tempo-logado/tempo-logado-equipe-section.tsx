"use client";

import { motion } from "framer-motion";

import { clearTempoLogadoAction } from "@/lib/google/d1/actions/clear-tempo-logado-action";
import type {
  OperadorLoginLogout,
  OperadorTempoLogado,
} from "@/lib/google/d1/tempo-logado";
import { ClearBaseButton } from "../clear-base-button";
import { CopyTempoLogadoButton } from "./copy-tempo-logado-button";
import { TempoLogadoEquipeTable } from "./tempo-logado-equipe-table";
import { UploadTempoLogadoDropzone } from "./upload-tempo-logado-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface TempoLogadoEquipeSectionProps {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
  showUpload?: boolean;
}

export function TempoLogadoEquipeSection({
  operadores,
  loginLogout,
  showUpload = false,
}: TempoLogadoEquipeSectionProps) {
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
        <div className="flex items-center gap-2">
          <CopyTempoLogadoButton
            operadores={operadores}
            loginLogout={loginLogout}
          />
          {showUpload && <ClearBaseButton action={clearTempoLogadoAction} />}
        </div>
      </div>

      {/* Grid: tabela à esquerda (780px) + upload à direita (resto) */}
      <div
        className="grid items-stretch gap-4"
        style={{ gridTemplateColumns: "780px 1fr" }}
      >
        <div>
          <TempoLogadoEquipeTable
            operadores={operadores}
            loginLogout={loginLogout}
          />
        </div>

        {showUpload && (
          <div>
            <UploadTempoLogadoDropzone />
          </div>
        )}
      </div>
    </motion.section>
  );
}
