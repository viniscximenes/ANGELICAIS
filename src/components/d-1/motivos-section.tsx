"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import type { OperadorMotivos } from "@/lib/google/d1";
import { MotivosChart } from "./motivos-chart";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface MotivosSectionProps {
  motivos: OperadorMotivos | null;
}

export function MotivosSection({ motivos }: MotivosSectionProps) {
  const [view, setView] = useState<"cancelados" | "retidos">("cancelados");

  const data = motivos?.[view] ?? {
    financeiro: 0,
    mudancaEndereco: 0,
    insatisfacaoServico: 0,
    insatisfacaoAtendimento: 0,
    mudancaProvedora: 0,
    outros: 0,
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">01</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Motivos</h2>
        </div>

        <div className="elevation-1 inline-flex gap-1 rounded-md p-1">
          <button
            onClick={() => setView("cancelados")}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              view === "cancelados"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            Cancelados
          </button>
          <button
            onClick={() => setView("retidos")}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              view === "retidos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            Retidos
          </button>
        </div>
      </div>

      <div className="elevation-1 rounded-lg p-6">
        <MotivosChart data={data} view={view} />
      </div>
    </motion.section>
  );
}
