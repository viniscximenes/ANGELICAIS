"use client";

import { useState } from "react";
import {
  IconCheck,
  IconCopy,
  IconTerminal,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

interface Props {
  protocoloText: string;
  onReset: () => void;
}

export function ProtocoloOutput({ protocoloText, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!protocoloText.trim()) {
      toast.error("Protocolo vazio");
      return;
    }

    try {
      await navigator.clipboard.writeText(protocoloText);
      setCopied(true);
      toast.success("Protocolo copiado");
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("[copy-protocolo] erro:", e);
      toast.error("Erro ao copiar");
    }
  }

  return (
    <div
      className="space-y-2 px-4 py-3"
      style={{
        background: "color-mix(in oklch, var(--primary) 4%, var(--background))",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconTerminal
            size={12}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <span className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
            Protocolo Gerado
          </span>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors"
            style={{ border: "1px solid var(--border)" }}
          >
            <IconTrash size={11} aria-hidden="true" />
            <span className="ds-mono">Limpar</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!protocoloText.trim()}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)" }}
          >
            {copied ? (
              <IconCheck
                size={11}
                style={{ color: "var(--success)" }}
                aria-hidden="true"
              />
            ) : (
              <IconCopy size={11} aria-hidden="true" />
            )}
            <span className="ds-mono">{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      </div>

      <div
        className="ds-mono rounded p-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          minHeight: "80px",
          color: protocoloText.trim()
            ? "var(--foreground)"
            : "var(--muted-foreground)",
          fontStyle: protocoloText.trim() ? "normal" : "italic",
        }}
      >
        {protocoloText ||
          "Preencha os campos acima para gerar o protocolo..."}
      </div>
    </div>
  );
}
