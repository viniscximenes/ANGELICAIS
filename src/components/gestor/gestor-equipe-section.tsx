"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconChartBar,
  IconEye,
  IconEyeOff,
  IconUsersGroup,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { ConfigTabelaPopover } from "@/components/gestor/config-tabela-popover";
import { StyledCard } from "@/components/gestor/styled-card";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import { refreshConsolidadoAction } from "@/lib/d1-db/actions/refresh-consolidado-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import {
  DEFAULT_META_TX_RETENCAO,
  DEFAULT_ORDEM_TABELA,
  type OrdemTabela,
} from "@/lib/gestor/config-tabela/types";
import { ordenarOperadores } from "@/lib/gestor/config-tabela/ordenar-operadores";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Intervalo do polling: reconsulta a base a cada 30s para refletir mudanças
// sem precisar de F5.
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
  /** Meta de TX Retenção (%, escala 0-100) — config do gestor, `gestor_config_fantasia.meta_tx_retencao`. */
  metaTxInicial?: number;
  /** Ordenação salva da tabela — `gestor_config_fantasia.ordem_tabela`. */
  ordemTabelaInicial?: OrdemTabela;
}

export function GestorEquipeSection({
  operadores: operadoresIniciais,
  equipe: equipeInicial,
  gestora,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
  metaTxInicial = DEFAULT_META_TX_RETENCAO,
  ordemTabelaInicial = DEFAULT_ORDEM_TABELA,
}: GestorEquipeSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [operadores, setOperadores] = useState(operadoresIniciais);
  const [equipe, setEquipe] = useState(equipeInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );
  const [metaTxRetencao, setMetaTxRetencao] = useState(metaTxInicial);
  const [ordemTabela, setOrdemTabela] = useState(ordemTabelaInicial);
  // Espelha o open/close do ConfigTabelaPopover só pra elevar a tabela acima
  // do overlay de blur (z-40) enquanto o popover está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);

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

  // Navegação via teclado: setas Cima (ArrowUp) e Baixo (ArrowDown) rolam a página
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        window.scrollBy({ top: 120, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ top: -120, behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  // Ordenação escolhida pelo gestor (config-tabela-popover). Aplicada tanto
  // na tabela visível (operadoresParaTela) quanto na variante PNG oculta
  // (operadores puro), pra exportação refletir a mesma ordem da tela.
  const operadoresOrdenados = useMemo(
    () => ordenarOperadores(operadoresParaTela, ordemTabela),
    [operadoresParaTela, ordemTabela],
  );
  const operadoresPngOrdenados = useMemo(
    () => ordenarOperadores(operadores, ordemTabela),
    [operadores, ordemTabela],
  );

  // EquipeTable trabalha com meta em fração (0-1); a config do gestor é
  // salva em percentual (0-100), igual à meta do Dashboard de Retenção.
  const metaTxFracao = metaTxRetencao / 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <h2 className="ds-h2 flex items-center gap-2">
              <IconUsersGroup
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              Equipe
            </h2>
            {formatReportLabel(equipe.horaReport, nomeSupervisorReport) && (
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatReportLabel(equipe.horaReport, nomeSupervisorReport)}
              </span>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/analitico/consolidado"
              className="bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-opacity cursor-pointer shadow-sm"
              style={{ fontSize: "12px" }}
            >
              <IconChartBar size={14} aria-hidden="true" />
              <span className="ds-mono-sm font-medium">Analítico Consolidado</span>
            </Link>

            <CopyTableButton
              operadores={operadores}
              equipe={equipe}
              supervisor={gestora}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            {showUpload && <ClearBaseButton action={clearConsolidadoAction} />}
            <ConfigTabelaPopover
              metaTxInicial={metaTxRetencao}
              ordemInicial={ordemTabela}
              onSaved={(metaTx, ordem) => {
                setMetaTxRetencao(metaTx);
                setOrdemTabela(ordem);
              }}
              onOpenChange={setConfigPopoverOpen}
            />
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
              operadores={operadoresPngOrdenados}
              equipe={equipe}
              variant="excel"
              metaTx={metaTxFracao}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4 lg:flex-row lg:items-stretch">
          <div
            className={cn(
              "shrink-0 relative transition-[z-index] duration-0",
              configPopoverOpen && "z-[45]",
            )}
            style={{ width: "600px", maxWidth: "100%" }}
          >
            <StyledCard withGradient className="h-full p-3">
              <EquipeTable
                key="gestor-equipe-visible"
                operadores={operadoresOrdenados}
                equipe={equipe}
                metaTx={metaTxFracao}
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
            </StyledCard>
          </div>

          {showUpload && (
            <div className="min-h-[180px] min-w-0 flex-1">
              <StyledCard withGradient className="flex h-full flex-col p-3">
                <span className="text-muted-foreground mb-3 block text-xs font-semibold uppercase tracking-wider">
                  Atualizar Base D-1
                </span>
                <div className="min-h-0 flex-1">
                  <UploadDropzone confirmRecentReport />
                </div>
              </StyledCard>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
