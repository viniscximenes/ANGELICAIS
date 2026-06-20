"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface ContratoItemProps {
  cliente: string;
  contrato: string;
  view: "cancelados" | "retidos";
  /** Opcional — nome do operador dono (usado no painel do gestor). */
  operador?: string;
}

export function ContratoItem({
  cliente,
  contrato,
  view,
  operador,
}: ContratoItemProps) {
  const [justCopied, setJustCopied] = useState(false);

  const accent = view === "cancelados" ? "var(--danger)" : "var(--success)";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contrato);
      setJustCopied(true);
      toast.success("Contrato copiado", {
        description: contrato,
        duration: 1500,
      });
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex items-center justify-between rounded-sm p-4 text-left transition-all hover:brightness-110"
      style={{
        background: "var(--elevation-1-bg)",
        border: "1px solid var(--elevation-1-border)",
        boxShadow: justCopied ? `0 0 0 2px ${accent}` : undefined,
      }}
    >
      {/* Barra lateral colorida */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[2px]"
        style={{ background: accent }}
      />

      <div className="min-w-0 flex-1 pl-2">
        <p className="ds-body truncate">{cliente}</p>
        <p className="ds-mono-sm text-muted-foreground mt-1">{contrato}</p>
        {operador && (
          <p className="ds-small text-muted-foreground mt-0.5 truncate opacity-80">
            {operador}
          </p>
        )}
      </div>
      <div className="ml-4 shrink-0">
        {justCopied ? (
          <IconCheck
            size={18}
            style={{ color: accent }}
            aria-hidden="true"
          />
        ) : (
          <IconCopy
            size={18}
            className="text-muted-foreground group-hover:text-foreground"
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}
