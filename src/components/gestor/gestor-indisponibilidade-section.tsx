"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { formatReportLabel } from "@/lib/gestor/format-report-label";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { refreshIndisponibilidadeAction } from "@/lib/gestor/refresh/refresh-indisponibilidade-action";
import { computeIndispResumo } from "@/lib/google/gestor/compute-indisp-resumo";
import type { GestorIndispLinha } from "@/lib/google/gestor/indisponibilidade-types";

import { CopyIndisponibilidadeButton } from "./copy-indisponibilidade-button";
import { IndisponibilidadeGrafico } from "./indisponibilidade-grafico";
import { IndisponibilidadePausasTable } from "./indisponibilidade-pausas-table";
import { IndisponibilidadeResumoCards } from "./indisponibilidade-resumo-cards";
import { IndisponibilidadeTable } from "./indisponibilidade-table";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Reconsulta o Google Sheets a cada 30s para refletir a base sem F5.
const POLL_INTERVAL_MS = 30_000;

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
  /** Nome do supervisor que fez o último report (BASE - 2!L2, junto com a hora). */
  nomeSupervisorReport?: string | null;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
}

export function GestorIndisponibilidadeSection({
  operadores: operadoresIniciais,
  horaReport: horaReportInicial,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
  nomeFantasia,
  olhoInicial = false,
}: GestorIndisponibilidadeSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [operadores, setOperadores] = useState(operadoresIniciais);
  const [horaReport, setHoraReport] = useState(horaReportInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );
  const resumo = computeIndispResumo(operadores);

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("indisponibilidade", novoValor);
  }

  // Polling: reconsulta o Sheets a cada 30s (sem F5) e atualiza operadores +
  // hora/nome do report se houver mudança.
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await refreshIndisponibilidadeAction();
      if (result.success) {
        setOperadores(result.operadores);
        setHoraReport(result.horaReport);
        setNomeSupervisorReport(result.nomeSupervisorReport);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-4">
        {/* Row 1: Headers aligned on desktop */}
        <div className="hidden lg:flex lg:items-baseline">
          <div className="shrink-0 flex items-baseline justify-between gap-4" style={{ width: "650px", paddingRight: "16px" }}>
            <div className="flex items-baseline gap-3">
              <span className="ds-mono text-muted-foreground">01</span>
              <span className="ds-mono text-muted-foreground">·</span>
              <h2 className="ds-h2">Equipe</h2>
              {formatReportLabel(horaReport, nomeSupervisorReport) && (
                <span className="ds-mono-sm text-foreground/80 font-medium">
                  - {formatReportLabel(horaReport, nomeSupervisorReport)}
                </span>
              )}
            </div>
            <div className="self-center translate-y-[2px]">
              <CopyIndisponibilidadeButton
                horaReport={horaReport}
                nomeSupervisorReport={nomeSupervisorReport}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 flex items-baseline gap-3 pl-2">
            <span className="ds-mono text-muted-foreground">02</span>
            <span className="ds-mono text-muted-foreground">·</span>
            <h2 className="ds-h2">Visão Rápida</h2>
          </div>
        </div>

        {/* Row 2: Content (Table & Cards side-by-side) */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          {/* Left Column: Table */}
          <div className="shrink-0 space-y-3 lg:space-y-0" style={{ width: "650px", maxWidth: "100%" }}>
            {/* Mobile Header (hidden on desktop) */}
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <div className="flex items-baseline gap-3">
                <span className="ds-mono text-muted-foreground">01</span>
                <span className="ds-mono text-muted-foreground">·</span>
                <h2 className="ds-h2">Equipe</h2>
                {formatReportLabel(horaReport, nomeSupervisorReport) && (
                  <span className="ds-mono-sm text-foreground/80 font-medium">
                    - {formatReportLabel(horaReport, nomeSupervisorReport)}
                  </span>
                )}
              </div>
              <CopyIndisponibilidadeButton
                horaReport={horaReport}
                nomeSupervisorReport={nomeSupervisorReport}
              />
            </div>
            <IndisponibilidadeTable
              operadores={operadores}
              nomeFantasia={nomeFantasia}
              olhoAberto={olhoAberto}
              onToggleOlho={handleToggleOlho}
            />
          </div>

          {/* Right Column: Cards */}
          <div className="min-w-0 flex-1 space-y-3 lg:space-y-0">
            {/* Mobile Header (hidden on desktop) */}
            <div className="flex items-baseline gap-3 lg:hidden">
              <span className="ds-mono text-muted-foreground">02</span>
              <span className="ds-mono text-muted-foreground">·</span>
              <h2 className="ds-h2">Visão Rápida</h2>
            </div>
            <IndisponibilidadeResumoCards resumo={resumo} />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── 03 Visão Detalhada ────────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="ds-mono text-muted-foreground">03</span>
        <span className="ds-mono text-muted-foreground">·</span>
        <h2 className="ds-h2">Visão Detalhada</h2>
      </div>

      <IndisponibilidadeGrafico operadores={operadores} />

      <Divider />

      {/* ── 04 Tabela de Pausas (sem export) ────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="ds-mono text-muted-foreground">04</span>
        <span className="ds-mono text-muted-foreground">·</span>
        <h2 className="ds-h2">Tabela de Pausas</h2>
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
          <IndisponibilidadeTable operadores={operadores} variant="excel" nomeFantasia={nomeFantasia} />
        </div>
      </div>
    </motion.section>
  );
}
