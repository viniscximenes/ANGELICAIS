"use client";

import { motion } from "framer-motion";

import { computeIndispResumo } from "@/lib/google/gestor/compute-indisp-resumo";
import type { GestorIndispLinha } from "@/lib/google/gestor/indisponibilidade-types";

import { CopyIndisponibilidadeButton } from "./copy-indisponibilidade-button";
import { IndisponibilidadeGrafico } from "./indisponibilidade-grafico";
import { IndisponibilidadePausasTable } from "./indisponibilidade-pausas-table";
import { IndisponibilidadeResumoCards } from "./indisponibilidade-resumo-cards";
import { IndisponibilidadeTable } from "./indisponibilidade-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function Divider() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <div className="divider-gradient flex-1" />
      <span className="ds-mono-sm text-muted-foreground">◆</span>
      <div className="divider-gradient flex-1" />
    </div>
  );
}

interface GestorIndisponibilidadeSectionProps {
  operadores: GestorIndispLinha[];
  horaReport: string;
}

export function GestorIndisponibilidadeSection({
  operadores,
  horaReport,
}: GestorIndisponibilidadeSectionProps) {
  const resumo = computeIndispResumo(operadores);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      {/* ── 01 Equipe (Tabela + Cards no topo) ─────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="ds-mono text-muted-foreground">01</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Equipe</h2>
            {horaReport && horaReport !== "—" && (
              <span className="ds-mono-sm text-muted-foreground">
                - atualizado às{" "}
                {horaReport.match(/^(\d{1,2}:\d{2})/)?.[1] ?? horaReport}
              </span>
            )}
          </div>
          <CopyIndisponibilidadeButton horaReport={horaReport} />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="shrink-0" style={{ width: "650px", maxWidth: "100%" }}>
            <IndisponibilidadeTable operadores={operadores} />
          </div>
          <div className="min-w-0 flex-1">
            <IndisponibilidadeResumoCards resumo={resumo} />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── 02 Gráfico ───────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="ds-mono text-muted-foreground">02</span>
        <span className="ds-mono text-muted-foreground">·</span>
        <h2 className="ds-h2">Indisponibilidade por Operador</h2>
      </div>

      <IndisponibilidadeGrafico operadores={operadores} />

      <Divider />

      {/* ── 03 Detalhe de pausas (sem export) ───────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="ds-mono text-muted-foreground">03</span>
        <span className="ds-mono text-muted-foreground">·</span>
        <h2 className="ds-h2">Detalhe de Pausas</h2>
      </div>

      <IndisponibilidadePausasTable operadores={operadores} />

      {/* Wrapper offscreen para captura do PNG (tabela 03) */}
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
          <IndisponibilidadeTable operadores={operadores} variant="excel" />
        </div>
      </div>
    </motion.section>
  );
}
