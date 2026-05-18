"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyIndispEquipeButton() {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>(
      "[data-indisp-equipe-table]",
    );

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      const pngDataUrl = await domToPng(target, { scale: 2 });

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
      console.error("[copy-indisp-equipe] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="gap-2"
    >
      {state === "copying" && (
        <>
          <IconLoader2
            size={16}
            className="animate-spin"
            aria-hidden="true"
          />
          Gerando...
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck
            size={16}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          Copiado
        </>
      )}
      {state === "idle" && (
        <>
          <IconCamera size={16} aria-hidden="true" />
          Copiar como imagem
        </>
      )}
    </Button>
  );
}
