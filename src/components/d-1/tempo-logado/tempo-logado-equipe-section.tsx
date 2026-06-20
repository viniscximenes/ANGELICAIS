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

      <div className="flex flex-col gap-3">
        {/* Linha 1: header (título alinhado com tabela, botões alinhados com anexo) */}
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0" style={{ width: "600px" }}>
            <div className="flex items-baseline gap-3">
              <span className="ds-mono text-muted-foreground">01</span>
              <span className="ds-mono text-muted-foreground">·</span>
              <h2 className="ds-h2">Equipe</h2>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <CopyTempoLogadoButton
              operadores={operadores}
              loginLogout={loginLogout}
            />
            {showUpload && <ClearBaseButton action={clearTempoLogadoAction} />}
          </div>
        </div>

        {/*
          Wrapper INVISÍVEL usado SÓ pela captura do PNG (variant excel).
          Vive off-screen pra não afetar o layout normal.
        */}
        <div
          data-tempo-logado-png-wrapper
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
            width: "600px",
          }}
        >
          <TempoLogadoEquipeTable
            key="tempo-logado-png"
            operadores={operadores}
            loginLogout={loginLogout}
            variant="excel"
          />
        </div>

        {/* Linha 2: conteúdo (tabela 600px | dropzone esticada) */}
        <div className="flex items-start gap-4">
          <div className="shrink-0" style={{ width: "600px" }}>
            <TempoLogadoEquipeTable
              key="tempo-logado-visible"
              operadores={operadores}
              loginLogout={loginLogout}
            />
          </div>

          {showUpload && (
            <div className="min-w-0 flex-1">
              <UploadTempoLogadoDropzone />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
