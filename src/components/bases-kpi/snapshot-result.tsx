"use client";

import {
  IconAlertCircle,
  IconCheck,
  IconUserOff,
} from "@tabler/icons-react";
import { motion } from "motion/react";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatMonthLabel } from "@/lib/kpi/bases/format-date";
import type { ProcessSnapshotResult } from "@/lib/kpi/bases/process-snapshot-action";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface SnapshotResultProps {
  result: ProcessSnapshotResult;
}

export function SnapshotResult({ result }: SnapshotResultProps) {
  if (!result.success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
        role="alert"
      >
        <StyledCard withGradient className="gap-0">
          <div className="flex items-start gap-3">
            <IconAlertCircle
              size={20}
              style={{ color: "var(--danger)" }}
              aria-hidden="true"
            />
            <div>
              <p className="ds-body font-medium">Falha ao processar</p>
              <p className="ds-small text-muted-foreground mt-1">
                {result.error}
              </p>
            </div>
          </div>
        </StyledCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <StyledCard withGradient className="gap-0">
        <div className="flex items-start gap-3">
          <IconCheck
            size={20}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="ds-body font-medium">Snapshot salvo</p>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              {result.totalOperators} operador
              {result.totalOperators === 1 ? "" : "es"} processado
              {result.totalOperators === 1 ? "" : "s"}
              {result.cadastradosNoSistema.length > 0 &&
                ` • ${result.cadastradosNoSistema.length} no sistema`}
              {result.naoCadastrados.length > 0 &&
                ` • ${result.naoCadastrados.length} não cadastrado${result.naoCadastrados.length === 1 ? "" : "s"}`}
            </p>

            {result.monthsDeleted.length > 0 && (
              <p
                className="ds-mono-sm mt-2"
                style={{ color: "var(--warning)" }}
              >
                Meses antigos apagados (retenção):{" "}
                {result.monthsDeleted.map((m) => formatMonthLabel(m)).join(", ")}
              </p>
            )}
          </div>
        </div>
      </StyledCard>

      {result.missingKpis.length > 0 && (
        <StyledCard withGradient className="gap-0">
          <div className="flex items-start gap-3">
            <IconAlertCircle
              size={20}
              style={{ color: "var(--warning)" }}
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="ds-body font-medium">
                KPIs não encontrados ({result.missingKpis.length})
              </p>
              <p className="ds-mono-sm text-muted-foreground mt-1 mb-3">
                Edite o nome do cabeçalho em Configurações → KPI → Mapeamento.
              </p>
              <ul className="space-y-1">
                {result.missingKpis.map((name) => (
                  <li key={name} className="ds-mono-sm text-muted-foreground">
                    • {name}
                  </li>
                ))}
              </ul>

              <div className="elevation-2 mt-4 space-y-1.5 rounded-md p-3">
                <p className="ds-mono-sm font-semibold">Debug do parser:</p>
                <p className="ds-mono-sm text-muted-foreground">
                  Separador detectado:{" "}
                  <span className="text-foreground">
                    {result.debugInfo.separator}
                  </span>
                </p>
                <p className="ds-mono-sm text-muted-foreground">
                  Total de cabeçalhos lidos:{" "}
                  <span className="text-foreground">
                    {result.debugInfo.totalHeaders}
                  </span>
                </p>
                <p className="ds-mono-sm text-muted-foreground">
                  Primeiros 300 caracteres da linha 1:
                </p>
                <pre
                  className="ds-mono-sm elevation-1 overflow-x-auto rounded p-2"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    fontSize: "11px",
                  }}
                >
                  {result.debugInfo.rawFirstLineSample}
                </pre>
              </div>

              <details className="mt-4">
                <summary className="ds-mono-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Ver cabeçalhos detectados na planilha (
                  {result.detectedHeaders.length})
                </summary>
                <div className="elevation-2 mt-3 max-h-60 overflow-y-auto rounded-md p-3">
                  <ol className="space-y-0.5">
                    {result.detectedHeaders.map((h, idx) => (
                      <li
                        key={idx}
                        className="ds-mono-sm"
                        style={{ wordBreak: "break-word" }}
                      >
                        <span className="text-muted-foreground">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>{" "}
                        {h || "(vazio)"}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </StyledCard>
      )}

      {result.missingMetadata.length > 0 && (
        <StyledCard withGradient className="gap-0">
          <div className="flex items-start gap-3">
            <IconAlertCircle
              size={20}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="ds-body font-medium">
                Metadados não encontrados ({result.missingMetadata.length})
              </p>
              <p className="ds-mono-sm text-muted-foreground mt-1 mb-3">
                Esses dados auxiliares não estavam no clipboard — não afeta os
                KPIs principais.
              </p>
              <ul className="space-y-1">
                {result.missingMetadata.map((name) => (
                  <li key={name} className="ds-mono-sm text-muted-foreground">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </StyledCard>
      )}

      {result.naoCadastrados.length > 0 && (
        <StyledCard withGradient className="gap-0">
          <details>
            <summary className="flex cursor-pointer items-center gap-3">
              <IconUserOff
                size={20}
                className="text-muted-foreground"
                aria-hidden="true"
              />
              <span className="ds-body font-medium">
                Operadores não cadastrados ({result.naoCadastrados.length})
              </span>
            </summary>
            <p className="ds-mono-sm text-muted-foreground mt-2 mb-3 ml-8">
              Salvos no banco, mas só aparecerão no painel após serem
              cadastrados em profiles.
            </p>
            <ul className="ml-8 max-h-40 space-y-0.5 overflow-y-auto">
              {result.naoCadastrados.map((email) => (
                <li key={email} className="ds-mono-sm text-muted-foreground">
                  {email}
                </li>
              ))}
            </ul>
          </details>
        </StyledCard>
      )}

      {result.warnings.length > 0 && (
        <StyledCard withGradient className="gap-0">
          <p className="ds-body mb-2 font-medium">Avisos</p>
          <ul className="space-y-0.5">
            {result.warnings.map((w, idx) => (
              <li key={idx} className="ds-mono-sm text-muted-foreground">
                • {w}
              </li>
            ))}
          </ul>
        </StyledCard>
      )}
    </motion.div>
  );
}
