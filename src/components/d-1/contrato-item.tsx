"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface ContratoItemProps {
  cliente: string;
  contrato: string;
}

export function ContratoItem({ cliente, contrato }: ContratoItemProps) {
  const [justCopied, setJustCopied] = useState(false);

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
      className={`elevation-1 hover:elevation-2 group flex items-center justify-between rounded-sm p-4 text-left transition-all ${
        justCopied ? "ring-2 ring-[var(--success)]" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="ds-body truncate">{cliente}</p>
        <p className="ds-mono-sm text-muted-foreground mt-1">{contrato}</p>
      </div>
      <div className="ml-4 shrink-0">
        {justCopied ? (
          <IconCheck
            size={18}
            className="text-[var(--success)]"
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
