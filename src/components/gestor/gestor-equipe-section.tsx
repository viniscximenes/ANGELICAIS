"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconEye, IconEyeOff, IconChartBar } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { clearConsolidadoAction } from "@/lib/google/d1/actions/clear-consolidado-action";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";
import { refreshConsolidadoAction } from "@/lib/gestor/refresh/refresh-consolidado-action";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Intervalo do polling: reconsulta o Google Sheets a cada 30s para refletir
// a base sem precisar de F5. 30s equilibra atualização rápida com a cota da
// API do Sheets.
const POLL_INTERVAL_MS = 30_000;

interface GestorEquipeSectionProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  /** Nome da gestora — usado no texto do report copiado. */
  gestora?: string;
  /** Mostra a área de upload da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  /** Nome do supervisor que fez o último report (BASE - 1!S2, junto com a hora). */
  nomeSupervisorReport?: string | null;
}

export function GestorEquipeSection({
  operadores: operadoresIniciais,
  equipe: equipeInicial,
  gestora,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
}: GestorEquipeSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [operadores, setOperadores] = useState(operadoresIniciais);
  const [equipe, setEquipe] = useState(equipeInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("consolidado", novoValor);
  }

  // Polling: reconsulta o Sheets a cada 30s (sem F5) e atualiza operadores +
  // hora/nome do report se houver mudança.
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await refreshConsolidadoAction();
      if (result.success) {
        setOperadores(result.operadores);
        setEquipe(result.equipe);
        setNomeSupervisorReport(result.nomeSupervisorReport);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Quando o olho está aberto, revela o nome real derivado do email original.
  // A tabela PNG usa sempre `operadores` (nomes fantasia já resolvidos no server).
  const operadoresParaTela = useMemo(() => {
    if (!nomeFantasia?.ativo || !olhoAberto) return operadores;
    return operadores.map((op) => ({
      ...op,
      email: deriveNomeOperador(op.emailOriginal ?? op.email),
    }));
  }, [operadores, nomeFantasia, olhoAberto]);

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
            {formatReportLabel(equipe.horaReport, nomeSupervisorReport) && (
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatReportLabel(equipe.horaReport, nomeSupervisorReport)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/analitico/consolidado"
              className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors cursor-pointer"
              style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            >
              <IconChartBar size={14} aria-hidden="true" />
              <span className="ds-mono-sm">Analítico Consolidado</span>
            </Link>

            <CopyTableButton
              operadores={operadores}
              equipe={equipe}
              supervisor={gestora}
              nomeSupervisorReport={nomeSupervisorReport}
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
              operadores={operadoresParaTela}
              equipe={equipe}
              headerButton={
                nomeFantasia?.ativo && (
                  <button
                    type="button"
                    onClick={handleToggleOlho}
                    title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center"
                  >
                    {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>
                )
              }
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
