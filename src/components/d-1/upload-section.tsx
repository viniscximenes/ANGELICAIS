"use client";

import { motion } from "framer-motion";

import { UploadDropzone } from "./upload-dropzone";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function UploadSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div style={{ maxWidth: "780px" }} className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">04</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Atualizar base</h2>
        </div>

        <p className="ds-small text-muted-foreground">
          Arraste o CSV exportado do sistema. A base atual será substituída
          automaticamente.
        </p>

        <UploadDropzone />
      </div>
    </motion.section>
  );
}
