"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface Props {
  text: string;
}

export function CopyDescriptionButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Descrição copiada");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground elevation-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
    >
      {copied ? (
        <IconCheck
          size={14}
          style={{ color: "var(--success)" }}
          aria-hidden="true"
        />
      ) : (
        <IconCopy size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">
        {copied ? "Copiado" : "Copiar descrição"}
      </span>
    </button>
  );
}
