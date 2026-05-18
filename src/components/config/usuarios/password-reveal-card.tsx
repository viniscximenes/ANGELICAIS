"use client";

import { useState } from "react";
import { IconAlertTriangle, IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface Props {
  password: string;
  userName: string;
}

export function PasswordRevealCard({ password, userName }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Senha copiada");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-2 rounded-lg p-3"
        style={{
          background: "color-mix(in oklch, var(--warning) 10%, transparent)",
          border:
            "1px solid color-mix(in oklch, var(--warning) 30%, transparent)",
        }}
      >
        <IconAlertTriangle
          size={16}
          style={{ color: "var(--warning)" }}
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
          Esta senha não será exibida novamente. Copie agora e envie ao
          usuário.
        </p>
      </div>

      <div className="space-y-2">
        <p className="ds-mono-sm text-muted-foreground tracking-wider">
          NOVA SENHA DE {userName.toUpperCase()}
        </p>
        <div
          className="elevation-2 flex items-center justify-between gap-3 rounded-lg px-4 py-3"
          style={{ border: "1px solid var(--border)" }}
        >
          <code
            className="ds-mono select-all"
            style={{ fontSize: "1rem", letterSpacing: "0.05em" }}
          >
            {password}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="elevation-1 hover:elevation-2 flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-all"
            style={{ border: "1px solid var(--border)" }}
          >
            {copied ? (
              <>
                <IconCheck
                  size={14}
                  style={{ color: "var(--success)" }}
                  aria-hidden="true"
                />
                <span
                  className="ds-mono-sm"
                  style={{ color: "var(--success)" }}
                >
                  Copiado
                </span>
              </>
            ) : (
              <>
                <IconCopy size={14} aria-hidden="true" />
                <span className="ds-mono-sm">Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
