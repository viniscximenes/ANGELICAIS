"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

export function CopyTempoLogadoButton() {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>(
      "[data-tempo-logado-png-wrapper] [data-tempo-logado-equipe-table]",
    );

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await domToPng(target, { scale: 3 });

      const blobResponse = await fetch(pngDataUrl);
      const imageBlob = await blobResponse.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": imageBlob }),
      ]);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole onde quiser (Ctrl+V)",
        duration: 2500,
      });

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-tempo-logado] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
    >
      {state === "copying" && (
        <>
          <IconLoader2
            size={14}
            className="animate-spin"
            aria-hidden="true"
          />
          <span className="ds-mono-sm">Gerando...</span>
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck
            size={14}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <span className="ds-mono-sm">Copiado</span>
        </>
      )}
      {state === "idle" && (
        <>
          <IconCamera size={14} aria-hidden="true" />
          <span className="ds-mono-sm">Copiar como imagem</span>
        </>
      )}
    </button>
  );
}
